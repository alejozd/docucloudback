const { exec } = require("child_process");

const getBatteryStatus = (req, res) => {
  exec("cat /sys/class/power_supply/BAT0/capacity", (error, stdout, stderr) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "No se pudo obtener el estado de la batería" });
    }
    res.json({ batteryLevel: `${stdout.trim()}%` });
  });
};

module.exports = { getBatteryStatus };
