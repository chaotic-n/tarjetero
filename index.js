const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ExcelJS = require('exceljs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let userData = {};

const serverRoles = {
    '1280278939461357600': '1286841495185391617', // EMS
    '1280280046333988990': '1297038390390423564', // UBERR
    '1280276570711265370': '1297013555039834204', // CARABINEROS
    '1280277558348484648': 'ID_ROL_SERVICIO_4', // MUNICIPALIDAD
    '1280275694219169814': '1281466429337501766', // PDI
    '1280274844394721394': 'ID_ROL_SERVICIO_6' // MECANICOS
};

async function generateExcel(guild) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de usuarios');

    worksheet.columns = [
        { header: 'ID de Usuario', key: 'id', width: 30 },
        { header: 'Nombre de Usuario', key: 'username', width: 30 },
        { header: 'Horas', key: 'hours', width: 10 },
        { header: 'Minutos', key: 'minutes', width: 10 },
        { header: 'Segundos', key: 'seconds', width: 10 },
    ];

    for (const [userId, data] of Object.entries(userData[guild.id])) {
        const totalSeconds = Math.floor(data.time * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        worksheet.addRow({
            id: userId,
            username: data.username,
            hours: hours,
            minutes: minutes,
            seconds: seconds
        });
    }

    const fileName = `registro_${guild.name}.xlsx`;
    await workbook.xlsx.writeFile(fileName);
    return fileName;
}

function formatTime(durationInMinutes) {
    const totalSeconds = Math.floor(durationInMinutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours} Horas, ${minutes} Minutos, ${seconds} Segundos`;
}

client.on('ready', () => {
    console.log(`Bot está listo como ${client.user.tag}`);

    // Configuración del estado del bot: No molestar y mensaje de estado
    client.user.setPresence({
        status: 'dnd', // Estado "No molestar"
        activities: [{ name: 'Trabajando...', type: ActivityType.Playing }] // Mensaje de estado
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { guild, member } = interaction;

    if (!userData[guild.id]) {
        userData[guild.id] = {};
    }

    const userId = member.id;
    const roleId = serverRoles[guild.id];

    switch (interaction.customId) {
        case 'start':
            if (roleId) {
                const serviceRole = guild.roles.cache.get(roleId);
                if (serviceRole) {
                    await member.roles.add(serviceRole);
                }
            }

            if (!userData[guild.id][userId]) {
                userData[guild.id][userId] = { username: member.user.tag, time: 0, startTime: Date.now() };
            }
            userData[guild.id][userId].startTime = Date.now();
            await interaction.reply({ content: 'Has comenzado tu servicio y el rol "En servicio" ha sido asignado.', ephemeral: true });
            break;

        case 'stop':
            if (roleId) {
                const removeRole = guild.roles.cache.get(roleId);
                if (removeRole) {
                    await member.roles.remove(removeRole);
                }
            }

            if (userData[guild.id][userId] && userData[guild.id][userId].startTime) {
                const duration = (Date.now() - userData[guild.id][userId].startTime) / 60000;
                userData[guild.id][userId].time += duration;
                userData[guild.id][userId].startTime = null;
            }

            await interaction.reply({ content: 'Has terminado tu servicio y el rol "En servicio" ha sido retirado.', ephemeral: true });
            break;

        case 'check':
            const timeWorked = userData[guild.id][userId] ? formatTime(userData[guild.id][userId].time) : '0 Horas, 0 Minutos, 0 Segundos';
            await interaction.reply({ content: `Has trabajado ${timeWorked}.`, ephemeral: true });
            break;

        case 'info':
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return await interaction.reply({ content: 'No tienes permisos para acceder a la información.', ephemeral: true });
            }
            const fileName = await generateExcel(guild);
            await interaction.reply({ content: `Aquí está el archivo Excel:`, files: [fileName], ephemeral: true });
            break;

        case 'reset':
            // Solo los administradores pueden reiniciar el contador
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return await interaction.reply({ content: 'No tienes permisos para reiniciar el contador.', ephemeral: true });
            }
            userData[guild.id] = {};
            await interaction.reply({ content: 'El contador ha sido reiniciado.', ephemeral: true });
            break;
    }
});

client.on('messageCreate', async message => {
    if (message.content === '!tarjetero') {
        const buttons = [
            { label: 'En servicio', customId: 'start', style: ButtonStyle.Primary },
            { label: 'Fuera de servicio', customId: 'stop', style: ButtonStyle.Secondary },
            { label: '?', customId: 'check', style: ButtonStyle.Success },
            { label: 'Info', customId: 'info', style: ButtonStyle.Success },
            { label: 'Reiniciar contador', customId: 'reset', style: ButtonStyle.Danger }
        ];

        const row = new ActionRowBuilder()
            .addComponents(buttons.map(btn => new ButtonBuilder().setCustomId(btn.customId).setLabel(btn.label).setStyle(btn.style)));

        await message.channel.send({ components: [row] });
    }
});

client.login('MTI5NjIwNDgxNDQ4ODgzMDA1Mw.GPCTvv.FZK4PddsjNOxcg9DgEVeVfLxUo5EA9q6VWjtyE');