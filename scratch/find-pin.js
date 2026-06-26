import bcrypt from 'bcryptjs';

const hashes = {
  Cajero1: "$2b$10$KcjvbCi4Mo2MQR2Wl3FsRuUI2A7.Y49e6RJ0GP5/MAqWEf3E2XOoC",
  "Mesero 1": "$2b$10$HhJPinT2sRFYMNqPzuaFWu/HE9jtATGz9pBgUyLNcMr2zq0S4WXB6",
  Supervisor: "$2b$10$rroeuML2Z5fsaBUzMD0gOO2IpNEZ6xwIX6MzYjkM644QhUUJgFU1u"
};

async function testPin(pin) {
  for (const [name, hash] of Object.entries(hashes)) {
    if (await bcrypt.compare(pin, hash)) {
      console.log(`FOUND PIN for ${name}: ${pin}`);
      return true;
    }
  }
  return false;
}

async function run() {
  console.log("Checking pins 0000 to 9999...");
  const common = ["1111", "1234", "0000", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "4321", "1379"];
  for (const pin of common) {
    await testPin(pin);
  }

  for (let i = 0; i <= 9999; i++) {
    const pin = i.toString().padStart(4, '0');
    if (common.includes(pin)) continue;
    await testPin(pin);
  }
  console.log("Finished all 4-digit PINs.");
}

run();
