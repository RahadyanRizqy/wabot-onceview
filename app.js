const { Client, LocalAuth }= require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config.json');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { zonedTimeToUtc } = require('date-fns-tz');

function formatDateTimeNow(timeZoneConfig, dateTimeFormat) {
    return format(zonedTimeToUtc(new Date(), timeZoneConfig), dateTimeFormat, { timeZone: timeZoneConfig });
}

function logErrorToFile(errorMsg, config) {
    const logDirectory = 'errorlog';
    const timestamp = formatDateTimeNow(config.timezone, 'dd-MM-yyyy-HH-mm-ss');
    const logFilePath = path.join(logDirectory, `${timestamp}.log`);
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory);
    }
    fs.appendFile(logFilePath, errorMsg + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}

let client;

if (os.platform() === 'linux') {
    client = new Client({
        puppeteer: {
            headless: true,
            executablePath: '/usr/bin/google-chrome-stable',
            args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
        },
        ffmpeg: './ffmpeg.exe',
        authStrategy: new LocalAuth({ clientId: `${config.clientId}`}),
        webVersionCache: {
            type: 'remote',
            remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html`,
        }
    });
} else {
    client = new Client({
        puppeteer: {
            headless: true,
            args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
        },
        authStrategy: new LocalAuth({ clientId: `${config.clientId}`}),
        webVersionCache: {
            type: 'remote',
            remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html`,
        }
    });
}

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});


client.on('message', async (message) => {
    // console.log(message);
    try {
        if (message.hasMedia && message._data.isViewOnce) {
            const media = await message.downloadMedia();

            if (message.from.includes('g.us')) {
                await client.sendMessage(`${config.ownerPhone}@c.us`, media, {
                    caption: `Once-view from group by +${message.author.replace('@c.us', '')}`
                });
            }
            else {
                await client.sendMessage(`${config.ownerPhone}@c.us`, media, {
                    caption: `Once-view from +${message.from.replace('@c.us', '')}`
                    // sendMediaAsSticker: true,
                });
            }
        }
    }
    catch (error) {
        if (config.consoleError) {
            console.log(error);
        }
        logErrorToFile(error.toString(), config);
        // console.error(error);
    }
    // const gcName = await message.getChat();

    // console.log(message); 
});

client.initialize();
