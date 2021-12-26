-- recursor-wall

-- connecting to local redis server without authentication
-- make sure to bind it to 127.0.0.1 only! (which is normally default)
redis = require 'redis'
redis_client = redis.connect('127.0.0.1', 6379)

local blocked_list_loaded = 0
local tmp = redis_client:ping()
local query_publish_channel = 'queries'
local redis_blocked_domains_set_key = 'blocked'
local blocked_domains = newDS()
local blocklist_reload_seconds = 5

function loadBlockedDomainsFromRedis()
  local now = os.time()
  -- we reload the list every x seconds
  if (now - blocked_list_loaded >= blocklist_reload_seconds) then
      local blocked = newDS()
      local domains = redis_client:smembers(redis_blocked_domains_set_key)
      for k, v in pairs(domains) do
          pdnslog('++ blocked ' .. v)
          blocked:add(v)
      end
      blocked_list_loaded = os.time()
      blocked_domains = blocked
  end
  return blocked
end

loadBlockedDomainsFromRedis()

function is_qname_blocked(qname)
    local dn = newDN(qname)
    if (blocked_domains:check(dn)) then
        pdnslog('BLOCKED: Qname ' .. qname .. ' is BLOCKED', pdns.loglevels.Warning)
        return true
    else
        pdnslog('>> ' .. qname .. ' NOT blocked', pdns.loglevels.Warning)
        return false
    end
end

-- is_qname_blocked("example.com")
-- is_qname_blocked("www.example.com")
-- is_qname_blocked("generic.example.com")
-- is_qname_blocked("a.b.c.example.com")

-- add this file to lua-dns-script
local qtt = {
    [1] = "A",
    [38] = "A6",
    [28] = "AAAA",
    [65400] = "ADDR",
    [18] = "AFSDB",
    [65401] = "ALIAS",
    [255] = "ANY",
    [252] = "AXFR",
    [257] = "CAA",
    [60] = "CDNSKEY",
    [59] = "CDS",
    [37] = "CERT",
    [5] = "CNAME",
    [49] = "DHCID",
    [32769] = "DLV",
    [39] = "DNAME",
    [48] = "DNSKEY",
    [43] = "DS",
    [108] = "EUI48",
    [109] = "EUI64",
    [13] = "HINFO",
    [45] = "IPSECKEY",
    [251] = "IXFR",
    [25] = "KEY",
    [36] = "KX",
    [29] = "LOC",
    [254] = "MAILA",
    [253] = "MAILB",
    [14] = "MINFO",
    [9] = "MR",
    [15] = "MX",
    [35] = "NAPTR",
    [2] = "NS",
    [47] = "NSEC",
    [50] = "NSEC3",
    [51] = "NSEC3PARAM",
    [61] = "OPENPGPKEY",
    [41] = "OPT",
    [12] = "PTR",
    [57] = "RKEY",
    [17] = "RP",
    [46] = "RRSIG",
    [24] = "SIG",
    [6] = "SOA",
    [99] = "SPF",
    [33] = "SRV",
    [44] = "SSHFP",
    [249] = "TKEY",
    [52] = "TLSA",
    [250] = "TSIG",
    [16] = "TXT",
    [256] = "URI",
    [11] = "WKS"
}

function translateQtype(qtype)
    local str = qtt[qtype]
    if str then
        return str
    else
        return tostring(qtype)
    end
end

-- this funciton is hooked before resolving starts
function preresolve(dq)
    -- return true to b

    loadBlockedDomainsFromRedis()
    local is_blocked = is_qname_blocked(dq.qname:toString())
    if is_blocked then
      -- spoof A record
      if dq.qtype == pdns.A then
          dq.rcode = 0 -- make it a normal answer
          dq:addAnswer(pdns.A, "127.0.0.3")
          return true
      end

      -- spoof AAAA
      if dq.qtype == pdns.AAAA then
          dq.rcode = 0 -- make it a normal answer
          dq:addAnswer(pdns.AAAA, "::1")
          return true
      end
    end

    -- default, do not rewrite this response, so send it to real resolver
    return false
end

function postresolve(dq)
    local rip = dq.remoteaddr:toString()
    local records = dq:getRecords()
    pdnslog("RECURSOR:QUERY> " .. translateQtype(dq.qtype) .. " " ..
                dq.qname:toString() .. " " .. rip)
    for k, v in pairs(records) do
        redis_client:publish(query_publish_channel, v.name:toString() .. "\t" ..
                                 translateQtype(dq.qtype) .. "\t" ..
                                 v:getContent())
    end
    return false
end

function nxdomain(dq)
    pdnslog("RECURSOR:NXDOMAIN " .. dq.qname:toString());
    return false
end

function nodata(dq)
    pdnslog("RECURSOR:NODATA " .. translateQtype(dq.qtype) .. " " ..
                dq.qname:toString());
    return false
end
