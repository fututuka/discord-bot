if (interaction.isModalSubmit() && interaction.customId === 'channel_modal') {

  await interaction.deferReply(); // ← ここを一番上に移動

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

  await interaction.editReply({
    content: `作成完了: ${channel}`
  });

  selectionMap.delete(interaction.user.id);
}