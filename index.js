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

// ユーザーごとの選択状態を保存
const selectionMap = new Map();

client.once('clientReady', () => {
  console.log(`ログイン: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {

  // /create コマンド
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'create') {

      const select = new UserSelectMenuBuilder()
        .setCustomId('user_select')
        .setPlaceholder('ユーザーを選択')
        .setMinValues(1)
        .setMaxValues(5); // ←人数上限（自由に変えてOK）

      const button = new ButtonBuilder()
        .setCustomId('create_channel')
        .setLabel('チャンネル作成')
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

  // ユーザー選択
  if (interaction.isUserSelectMenu()) {
    selectionMap.set(interaction.user.id, interaction.values);

    await interaction.reply({
      content: `選択: ${interaction.values.map(id => `<@${id}>`).join(', ')}`,
      ephemeral: true
    });
  }

  // ボタン押下
  if (interaction.isButton()) {
    if (interaction.customId === 'create_channel') {

      const selectedUsers = selectionMap.get(interaction.user.id);

      if (!selectedUsers) {
        return interaction.reply({
          content: '先にユーザーを選択してください',
          ephemeral: true
        });
      }

      const guild = interaction.guild;

      // 権限設定
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
        name: `private-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: permissions
      });

      await interaction.reply({
        content: `作成完了: ${channel}`,
        ephemeral: true
      });

      selectionMap.delete(interaction.user.id);
    }
  }

});

client.login(process.env.TOKEN);