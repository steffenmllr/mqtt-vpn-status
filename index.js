const mqtt = require('mqtt')
const cron = require('cron');
const ipInfo = require('ipinfo');
const speedTest = require('speedtest-net');
const cronstring = require('cronstring');

const MQTT_HOST = process.env.MQTT_HOST || 'http://192.168.1.88:1883';
const MQTT_USER = process.env.MQTT_USER || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

const client = mqtt.connect(MQTT_HOST, {
    username: MQTT_USER,
    password: MQTT_PASSWORD,
    clientId: 'vpnstatus',
    will: {
        topic: 'vpn/state'
        payload: 'DISCONNECTED',
        retain: true
    }
})

let vpnSpeedRunning = false;
const sendSpeedUpdate = () => {
    if (vpnSpeedRunning) {
        console.log('Skipping VPN Speed');
        return;
    }
    vpnSpeedRunning = true;
    speedTest().on('data', data => {
        client.publish('vpn/download', JSON.stringify(data.speeds))
        vpnSpeedRunning = false;
    });
};

let ipInfoRunning = false;
const sendStateUpdate = () => {
    if (ipInfoRunning) {
        return;
    }
    ipInfoRunning = true;
    ipInfo((err, cLoc) => {
        cLoc.created_at = new Date();
        client.publish('vpn/state', JSON.stringify(cLoc))
        ipInfoRunning = false;
    });
}

client.on('connect', function(foo, bar) {
    client.subscribe('vpn/update')
    sendStateUpdate();
    sendSpeedUpdate();

    cronJobVpn.start();
    cronJobVpnSpeed.start();
})

// Subscribe to update Calls
client.on('message', function (topic, message) {
    if (topic === 'vpn/update') {
        sendStateUpdate();
    }
});


const cronJobVpn = cron.job(cronstring('every 2 minutes'), sendStateUpdate);
const cronJobVpnSpeed = cron.job(cronstring('every 60 minutes'), sendSpeedUpdate);


// Some cleanup
const handleAppExit = (options, err) => {
    if (err) {
        console.log(err.stack)
    }
    if (options.cleanup) {
        client.publish('vpn/state', 'DISCONNECTED')
    }
    if (options.exit) {
        process.exit()
    }
}

process.on('exit', handleAppExit.bind(null, {
    cleanup: true
}))
process.on('SIGINT', handleAppExit.bind(null, {
    exit: true
}))
process.on('uncaughtException', handleAppExit.bind(null, {
    exit: true
}))

