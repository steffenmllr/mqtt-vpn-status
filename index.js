const mqtt = require('mqtt')
const cron = require('cron');
const ipInfo = require('ipinfo');
const speedTest = require('speedtest-net');
const cronstring = require('cronstring');

const MQTT_HOST = process.env.MQTT_HOST || 'http://192.168.1.106:1883';
const MQTT_USER = process.env.MQTT_USER || 'pi';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'raspberry';

const client = mqtt.connect(MQTT_HOST, {
    username: MQTT_USER,
    password: MQTT_PASSWORD,
    clientId: 'vpnstatus'
})

let vpnSpeedRunning = false;
const sendSpeedUpdate = () => {
    if (vpnSpeedRunning) {
        console.log('Skipping VPN Speed');
        return;
    }
    vpnSpeedRunning = true;
    speedTest().on('data', data => {
        console.log(JSON.stringify(data.speeds));
        client.publish('vpn/download', JSON.stringify(data.speeds))
        vpnSpeedRunning = false;
    });
};

let ipInfoRunning = false;
const sendStateUpdate = () => {
    if (ipInfoRunning) {
        console.log('Skipping IP');
        return;
    }
    ipInfoRunning = true;
    ipInfo((err, cLoc) => {
        console.log(JSON.stringify(cLoc));
        client.publish('vpn/state', JSON.stringify(cLoc))
        ipInfoRunning = false;
    });
}

client.on('connect', function(foo, bar) {
    client.publish('vpn/connected', 'true');
    client.subscribe('vpn/update')
    sendStateUpdate();
    sendSpeedUpdate();

    cronJobVpn.start();
    cronJobVpnSpeed.start();
})

// Subscribe to update Calls
client.on('message', function (topic, message) {
    if (topic === 'vpn/update') {
        console.log('vpn/update');
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
        client.publish('vpn/connected', 'false')
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

