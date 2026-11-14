'use strict';

const HID = require('node-hid');

const VID = 0xfeed;
const PID = 0x6001;
const matches = HID.devices().filter((device) => device.vendorId === VID && device.productId === PID);

if (matches.length === 0) {
  console.log('No Grid Macro 1 VID/PID (0xFEED:0x6001) interfaces found.');
  process.exitCode = 1;
} else {
  console.log(`Found ${matches.length} Grid Macro 1 HID interface(s):`);
  for (const [index, device] of matches.entries()) {
    console.log(JSON.stringify({
      index,
      path: device.path,
      interface: device.interface,
      usagePage: device.usagePage,
      usage: device.usage,
      manufacturer: device.manufacturer,
      product: device.product,
      serialNumber: device.serialNumber,
      rawHidCandidate: device.usagePage === 0xff60 && device.usage === 0x61,
    }, null, 2));
  }
}
