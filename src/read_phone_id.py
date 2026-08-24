# Reads the Grove 6-Position DIP Switch at startup to determine phone ID.
# Switch 1 ON = phone 0, Switch 2 ON = phone 1, Switch 3 ON = phone 2, Switch 4 ON = phone 3.
# Falls back to 0 if the module is missing or unreadable.

import smbus2
import time

def read_phone_id():
    try:
        bus = smbus2.SMBus(1)
        write = smbus2.i2c_msg.write(0x03, [0x01])
        bus.i2c_rdwr(write)
        time.sleep(0.01)
        read = smbus2.i2c_msg.read(0x03, 10)
        bus.i2c_rdwr(read)
        switches = list(read)
        # Bytes 4-9 are switch states: 0x00 = ON, 0x01 = OFF
        for i in range(4):
            if switches[4 + i] == 0x00:
                return i
    except Exception:
        pass
    return 0  # default if DIP switch missing or unreadable
