"""
The Grove DIP switch is a static switch meant to configure things
Module   : Grove - 6-Position DIP Switch (SKU 101020399)
Address  : 0x03  ← NOTE: falls in the reserved 0x00-0x07 range, so standard
                   i2cdetect won't see it. Always use: i2cdetect -y -a 1

Connection: power (3.3 or 5V), ground, sda, scl (I²C)

This chip does NOT use standard I2C register addressing.
It uses a command/response protocol:
  1. Write a single command byte to the device
  2. Wait ~10ms for the chip to prepare its response
  3. Read back N bytes

Known commands:
  0x00 → Device ID / firmware version (8 bytes)
          e.g. ['0x3', '0x0', '0x86', '0x28', ...]
  0x01 → Switch state packet (16 bytes)

Command 0x01 response packet layout (16 bytes)
-----------------------------------------------
Byte  0   : Event flag. 0x01 = state changed since last read, 0x00 = no change
Bytes 1-3 : Unknown / padding (always 0x00)
Bytes 4-9 : Switch states, one byte per switch (switches 1-6 respectively)
              0x00 = switch is ON  (closed)
              0x01 = switch is OFF (open)

# check if I²C is enabled on pi: sudo raspi-config 
    # > Interface Options → I2C → Enable (reboot if changed)
"""
import smbus2
import time

# I2C bus 1 is the standard bus on all 40-pin Raspberry Pi models
bus = smbus2.SMBus(1)

# Device address — sits in the reserved range, requires -a flag with i2cdetect
ADDR = 0x03

# Command to request the full switch state packet
CMD_GET_SWITCH_STATE = 0x01

# Packet layout constants
PACKET_SIZE       = 16  # total bytes to read
SWITCH_BYTE_START = 4   # index of first switch byte in the response
SWITCH_COUNT      = 6   # number of switches on this module
SWITCH_ON         = 0x00  # byte value when switch is ON (active low)
SWITCH_OFF        = 0x01  # byte value when switch is OFF


def read_switches():
    """
    Send the state command to the DIP switch module and return the raw
    16-byte response packet, or None if the read failed.

    The chip requires a write-then-read sequence — you cannot just call
    read_byte() or read_i2c_block_data() without first sending a command.
    """
    try:
        # Step 1: send the command byte to request switch states
        write = smbus2.i2c_msg.write(ADDR, [CMD_GET_SWITCH_STATE])
        bus.i2c_rdwr(write)

        # Step 2: give the chip time to prepare its response
        time.sleep(0.01)

        # Step 3: read the full 16-byte response packet
        read = smbus2.i2c_msg.read(ADDR, PACKET_SIZE)
        bus.i2c_rdwr(read)

        return list(read)

    except OSError:
        # I/O errors can occur if the bus gets into a bad state.
        # They usually self-resolve — just retry on the next iteration.
        return None


def parse_switches(packet):
    """
    Extract the 6 switch states from a raw response packet.
    Returns a list of 6 booleans: True = ON, False = OFF.
    """
    return [
        packet[SWITCH_BYTE_START + i] == SWITCH_ON
        for i in range(SWITCH_COUNT)
    ]


def main():
    print("Grove 6-Position DIP Switch reader")
    print("Press Ctrl+C to exit\n")

    last_packet = None

    while True:
        packet = read_switches()

        # Only update display when the packet actually changes
        if packet is not None and packet != last_packet:
            last_packet = packet
            states = parse_switches(packet)
            print("─" * 30)
            for i, is_on in enumerate(states):
                print(f"  Switch {i + 1}: {'ON ' if is_on else 'OFF'}")

        # Poll at 20Hz — fast enough to feel responsive, not so fast
        # it hammers the I2C bus and causes read errors
        time.sleep(0.05)


if __name__ == "__main__":
    main()