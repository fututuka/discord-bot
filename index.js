const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
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

  // /create
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

  // メンバー選択
  if (interaction.isUserSelectMenu() && interaction.customId === 'user_select') {
    selectionMap.set(interaction.user.id, interaction.values);

    await interaction.reply({
      content: 'メンバーを選択しました',
      ephemeral: true
    });
  }

  // チャンネル作成
  if (interaction.isButton() && interaction.customId === 'create_channel') {

    await interaction.deferReply();

    try {
      const users = selectionMap.get(interaction.user.id) || [];

      const name = interaction.member?.displayName || interaction.user.username;
      const safeName = name.replace(/\s+/g, '_');
      const channelName = `コラボ_${safeName}`;

      const guild = interaction.guild;

      const permissions = [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
        ...users.map(id => ({
          id: id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        }))
      ];

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: permissions
      });

      // ★ ここが重要（遅延入れて確実に送る）
      setTimeout(async () => {
        try {
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
        } catch (err) {
          console.error("送信失敗:", err);
        }
      }, 1000);

      await interaction.editReply({
        content: `作成完了: ${channel}`
      });

      selectionMap.delete(interaction.user.id);

    } catch (err) {
      console.error(err);

      await interaction.editReply({
        content: 'エラーが発生しました'
      });
    }
  }

  // メンバー追加ボタン
  if (interaction.isButton() && interaction.customId === 'add_member') {

    const select = new UserSelectMenuBuilder()
      .setCustomId('add_member_select')
      .setPlaceholder('追加するメンバー');

    await interaction.reply({
      content: '追加するメンバーを選択',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // メンバー追加処理
  if (interaction.isUserSelectMenu() && interaction.customId === 'add_member_select') {

    for (const userId of interaction.values) {
      await interaction.channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true
      });
    }

    await interaction.reply({
      content: 'メンバーを追加しました',
      ephemeral: true
    });
  }

  // 退出
  if (interaction.isButton() && interaction.customId === 'leave_channel') {

    await interaction.channel.permissionOverwrites.delete(interaction.user.id);

    await interaction.reply({
      content: '退出しました',
      ephemeral: true
    });
  }

});

client.login(process.env.TOKEN);