import os from 'os';

/**
 * Inspect all local network adapters and prioritize the best interface for phone pairing.
 * Priority hierarchy:
 *  1: Mobile Hotspot / Wi-Fi Direct (192.168.137.x or 192.168.43.x)
 *  2: Standard Wi-Fi LAN
 *  3: Physical Ethernet / USB Tethering
 *  4: Virtual / VPN / WSL Adapters
 * 99: Localhost fallback
 */
export function getAvailableIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addressList = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;

    for (const net of netList) {
      // Check for IPv4 and skip internal loopback
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) {
        const lowerName = name.toLowerCase();
        const address = net.address;

        let priority = 4;
        let label = 'Virtual / VPN Adapter';

        // Check for Mobile Hotspot / Wi-Fi Direct
        if (
          lowerName.includes('local area connection*') ||
          lowerName.includes('hotspot') ||
          lowerName.includes('wi-fi direct') ||
          address.startsWith('192.168.43.') ||
          address.startsWith('192.168.137.')
        ) {
          priority = 1;
          label = 'Mobile Hotspot / Wi-Fi Direct';
        }
        // Check for Wi-Fi / Wireless / WLAN
        else if (
          lowerName.includes('wi-fi') ||
          lowerName.includes('wireless') ||
          lowerName.includes('wlan')
        ) {
          priority = 2;
          label = 'Wi-Fi LAN';
        }
        // Check for Ethernet / USB Tethering
        else if (
          lowerName.includes('ethernet') ||
          lowerName.includes('eth') ||
          lowerName.includes('usb') ||
          lowerName.includes('rndis')
        ) {
          priority = 3;
          label = 'Ethernet / USB Tethering';
        }

        addressList.push({
          name,
          address,
          netmask: net.netmask,
          mac: net.mac,
          label,
          priority
        });
      }
    }
  }

  // Sort by priority ascending (1 -> 2 -> 3 -> 4)
  addressList.sort((a, b) => a.priority - b.priority);

  // If no external adapter was found, append localhost fallback
  if (addressList.length === 0) {
    addressList.push({
      name: 'Localhost',
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      mac: '00:00:00:00:00:00',
      label: 'Localhost (Testing Only)',
      priority: 99
    });
  }

  return addressList;
}

export default {
  getAvailableIPv4Addresses
};
