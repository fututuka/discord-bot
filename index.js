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

// ★ここにカテゴリID
const CATEGORY_ID = '1489259069767291002';

client.once('clientReady', () => {
  console.log(`ログイン: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {

  // /create
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'create') {

      const select = new UserSelectMenuBuilder()
        .setCustomId('user_select')
        .setPlaceholder('メンバーを選択')
        .setMinValues(1)
        .setMaxValues(5);

      const button = new ButtonBuilder()
        .setCustomId('open_modal')
        .setLabel('次へ')
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        content: 'メンバーを選択してください',
        components: [
          new ActionRowBuilder().addComponents(select),
          new ActionRowBuilder().addComponents(button)
        ],
        ephemeral: true
      });
    }
  }

  // メンバー選択
  if (interaction.isUserSelectMenu() && interaction.customId === 'user_select') {
    selectionMap.set(interaction.user.id, interaction.values);

    await interaction.reply({
      content: `選択: ${interaction.values.map(id => `<@${id}>`).join(', ')}`,
      ephemeral: true
    });
  }

  // モーダル表示
  if (interaction.isButton() && interaction.customId === 'open_modal') {

    const modal = new ModalBuilder()
      .setCustomId('channel_modal')
      .setTitle('チャンネル作成');

    const input = new TextInputBuilder()
      .setCustomId('channel_name')
      .setLabel('チャンネル名')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);
  }

  // チャンネル作成
  if (interaction.isModalSubmit() && interaction.customId === 'channel_modal') {

    const selectedUsers = selectionMap.get(interaction.user.id);
    if (!selectedUsers) {
      return interaction.reply({ content: '先にメンバー選択してください', ephemeral: true });
    }

    const channelName = interaction.fields.getTextInputValue('channel_name');
    const guild = interaction.guild;

    const permissions = [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
      },
      ...selectedUsers.map(id => ({
        id: id,
        allow: [PermissionsBitField.Flags.ViewChannel],
      }))
    ];

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: permissions
    });

    // ボタン設置
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
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });

    await interaction.reply({
      content: `作成完了: ${channel}`,
      ephemeral: true
    });

    selectionMap.delete(interaction.user.id);
  }

  // メンバー追加ボタン
  if (interaction.isButton() && interaction.customId === 'add_member') {

    const select = new UserSelectMenuBuilder()
      .setCustomId('add_member_select')
      .setPlaceholder('追加するメンバー')
      .setMinValues(1)
      .setMaxValues(5);

    await interaction.reply({
      content: '追加するメンバーを選択',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // メンバー追加処理
  if (interaction.isUserSelectMenu() && interaction.customId === 'add_member_select') {

    const channel = interaction.channel;

    for (const userId of interaction.values) {
      await channel.permissionOverwrites.edit(userId, {
        ViewChannel: true
      });
    }

    await interaction.reply({
      content: '追加しました',
      ephemeral: true
    });
  }

  // 退出ボタン
  if (interaction.isButton() && interaction.customId === 'leave_channel') {

    const channel = interaction.channel;

    await channel.permissionOverwrites.delete(interaction.user.id);

    await interaction.reply({
      content: '退出しました',
      ephemeral: true
    });
  }

});

client.login(process.env.TOKEN);