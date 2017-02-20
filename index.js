const mqtt = require('mqtt')
const cron = require('cron');
const ipInfo = require('ipinfo');
const speedTest = require('speedtest-net');

const MQTT_HOST = process.env.MQTT_HOST || 'http://192.168.1.106:1883';
const MQTT_USER = process.env.MQTT_USER || 'pi';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'raspberry';

const client = mqtt.connect(MQTT_HOST, {
    username: MQTT_USER,
    password: MQTT_PASSWORD,
    clientId: 'vpnstatus'
})

// Run every 10 minutes
const cronJobVpn = cron.job("0 */2 * * * *", function(){
    sendStateUpdate();
});

const cronJobVpnSpeed = cron.job("0 * */1 * * *", function(){
    sendSpeedUpdate();
});

const sendSpeedUpdate = () => {
    speedTest().on('data', data => {
        client.publish('vpn/download', JSON.stringify(data.speeds))
    });
};

const sendStateUpdate = () => {
    ipInfo((err, cLoc) => {
        client.publish('vpn/state', JSON.stringify(cLoc))
    });
}


client.on('connect', function() {
    client.publish('vpn/connected', 'true');
    sendStateUpdate();
    sendSpeedUpdate();

    cronJobVpn.start();
    cronJobVpnSpeed.start();
})


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

