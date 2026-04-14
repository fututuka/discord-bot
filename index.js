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
    // チャンネル作成（1回のみ）
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

      try {
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

        await channel.setTopic(`owner:${interaction.user.id}`);

        // チャンネルに管理ボタン
        await channel.send({
          content: 'チャンネル作成完了'
        });

        // ★ここが重要（ボタン削除）
        await interaction.editReply({
          content: `作成完了: ${channel}`,
          components: [] // ← ボタン消す
        });

        selectionMap.delete(interaction.user.id);

      } catch (err) {
        console.error(err);

        await interaction.editReply({
          content: 'エラーが発生しました'
        });
      }
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