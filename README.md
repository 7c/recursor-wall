# recursor-wall
a small toolchain and proof-of-concept how to use pdns-recursor as dns firewall with redis backend


## installation
```
apt install redis-server redis-tools pdns-recursor lua5.1 lua-redis
```

### pdns-recursor/recursor.conf
`lua-dns-script=/opt/recursor-wall/recursor-helper.lua`

### redis-server
bind to 127.0.0.1 only for security reasons
