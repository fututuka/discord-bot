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

  if (interaction.isChatInputCommand() && interaction.commandName === 'create') {

    const select = new UserSelectMenuBuilder()
      .setCustomId('user_select')
      .setPlaceholder('メンバーを選択')
      .setMinValues(1)
      .setMaxValues(5);

    await interaction.reply({
      content: 'メンバーを選択してください',
      components: [
        new ActionRowBuilder().addComponents(select)
      ],
      ephemeral: true
    });
  }

  if (interaction.isUserSelectMenu() && interaction.customId === 'user_select') {

    selectionMap.set(interaction.user.id, interaction.values);

    const modal = new ModalBuilder()
      .setCustomId('channel_modal')
      .setTitle('チャンネル作成');

    const input = new TextInputBuilder()
      .setCustomId('channel_name')
      .setLabel('チャンネル名')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'channel_modal') {

    const users = selectionMap.get(interaction.user.id);
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
      ...users.map(id => ({
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

    await interaction.deferReply({ ephemeral: true });

　　await interaction.editReply({
  　　content: `作成完了: ${channel}`
　　});

    selectionMap.delete(interaction.user.id);
  }

  if (interaction.isButton() && interaction.customId === 'add_member') {

    const select = new UserSelectMenuBuilder()
      .setCustomId('add_member_select')
      .setPlaceholder('追加するメンバー');

    await interaction.reply({
      content: 'メンバー選択',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  if (interaction.isUserSelectMenu() && interaction.customId === 'add_member_select') {

    for (const userId of interaction.values) {
      await interaction.channel.permissionOverwrites.edit(userId, {
        ViewChannel: true
      });
    }

    await interaction.reply({ content: '追加しました', ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'leave_channel') {

    await interaction.channel.permissionOverwrites.delete(interaction.user.id);

    await interaction.reply({ content: '退出しました', ephemeral: true });
  }

});

client.login(process.env.TOKEN);