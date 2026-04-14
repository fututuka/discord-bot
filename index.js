const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const selectionMap = new Map();
const CATEGORY_ID = '1489259069767291002';

client.once('clientReady', () => {
  console.log("NEW CODE LOADED");
  console.log(`ログイン: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {

    // =========================
    // /create
    // =========================
    if (interaction.isChatInputCommand() && interaction.commandName === 'create') {

      const select = new UserSelectMenuBuilder()
        .setCustomId('user_select')
        .setPlaceholder('メンバーを選択')
        .setMinValues(1)
        .setMaxValues(5);

      const button = new ButtonBuilder()
        .setCustomId('create_channel')
        .setLabel('チャンネル作成')
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        content: 'メンバーを選択して作成ボタンを押してください',
        components: [
          new ActionRowBuilder().addComponents(select),
          new ActionRowBuilder().addComponents(button)
        ],
        ephemeral: true
      });
    }

    // =========================
    // メンバー選択
    // =========================
    else if (interaction.isUserSelectMenu() && interaction.customId === 'user_select') {
      selectionMap.set(interaction.user.id, interaction.values);
      await interaction.deferUpdate();
    }

    // =========================
    // チャンネル作成
    // =========================
    else if (interaction.isButton() && interaction.customId === 'create_channel') {

      const users = selectionMap.get(interaction.user.id);

      if (!users || users.length === 0) {
        return interaction.reply({
          content: '先にメンバーを選択してください',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const name = interaction.member?.displayName || interaction.user.username;
      const channelName = `コラボ_${name.replace(/\s+/g, '_')}`;

      const guild = interaction.guild;

      const permissions = [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        ...users.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel] }))
      ];

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: permissions
      });

      await channel.setTopic(`owner:${interaction.user.id}`);

      // 管理ボタン
      await channel.send({
        content: 'メンバー管理',
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('add_member')
              .setLabel('➕ メンバー追加')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('leave_channel')
              .setLabel('🚪 退出')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('rename_channel')
              .setLabel('✏️ チャンネル変更（1回のみ）')
              .setStyle(ButtonStyle.Secondary)
          )
        ]
      });

      await interaction.editReply({
        content: `作成完了: ${channel}`,
        components: []
      });

      selectionMap.delete(interaction.user.id);
    }

    // =========================
    // メンバー追加
    // =========================
    else if (interaction.isButton() && interaction.customId === 'add_member') {

      const select = new UserSelectMenuBuilder()
        .setCustomId('add_member_select')
        .setPlaceholder('追加するメンバー');

      await interaction.reply({
        content: '追加するメンバーを選択',
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true
      });
    }

    else if (interaction.isUserSelectMenu() && interaction.customId === 'add_member_select') {
      await interaction.deferUpdate();

      for (const userId of interaction.values) {
        await interaction.channel.permissionOverwrites.edit(userId, {
          ViewChannel: true
        });
      }
    }

    // =========================
    // 退出
    // =========================
    else if (interaction.isButton() && interaction.customId === 'leave_channel') {

      await interaction.deferReply({ ephemeral: true });

      await interaction.channel.permissionOverwrites.delete(interaction.user.id);

      await interaction.editReply({
        content: '退出しました'
      });
    }

    // =========================
    // チャンネル変更（注意表示 → modal）
    // =========================
    else if (interaction.isButton() && interaction.customId === 'rename_channel') {

      const topic = interaction.channel.topic;
      const ownerId = topic?.replace('owner:', '');

      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: '作成者のみ変更できます',
          ephemeral: true
        });
      }

      // ★ 注意表示＋モーダル
      const modal = new ModalBuilder()
        .setCustomId('rename_modal')
        .setTitle('⚠️ 一度きりの変更です');

      const input = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('チャンネル名（※変更は一度のみ）')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      await interaction.showModal(modal);
    }

    // =========================
    // 名前変更（1回のみ）
    // =========================
    else if (interaction.isModalSubmit() && interaction.customId === 'rename_modal') {

      await interaction.deferReply({ ephemeral: true });

      const newName = interaction.fields.getTextInputValue('new_name');

      await interaction.channel.setName(newName);

      // renameボタン削除
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('add_member')
          .setLabel('➕ メンバー追加')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('leave_channel')
          .setLabel('🚪 退出')
          .setStyle(ButtonStyle.Danger)
      );

      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const target = messages.find(msg => msg.components.length > 0);

      if (target) {
        await target.edit({
          components: [row]
        });
      }

      await interaction.editReply({
        content: `変更完了: ${newName}`
      });
    }

  } catch (err) {
    console.error(err);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'エラーが発生しました',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);