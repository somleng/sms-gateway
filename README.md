# Somleng SMS Gateway

[![GitHub Action](https://github.com/somleng/sms-gateway/actions/workflows/build.yml/badge.svg)](https://github.com/somleng/sms-gateway/actions)

Somleng SMS Gateway (part of [The Somleng Project](https://github.com/somleng/somleng-project)) is used to setup your own on-premise SMS gateway system.
This will give you the ability to take full control of your SMS infrastructure.

![Somleng SMS Gateway](assets/diagram.png)

## How to run
### Connect SMS Gateway to GoIP (GSM Gateway)
```sh
./somleng-sms-gateway goip -k [your-device-key] \
   --goip-smpp-host [goip-ip-address] \
   --goip-smpp-system-id [smpp-system-id] \
   --goip-smpp-password [smpp-password] \
   --goip-channels [num-channels]
```

## License

The software is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
