const { exec } = require("child_process");

const getBatteryStatus = (req, res) => {
  let batteryInfo = {
    batteryLevel: "No disponible",
    chargingStatus: "No disponible",
    energyFull: "No disponible",
    energyNow: "No disponible",
    powerNow: "No disponible",
    estimatedTime: "No disponible",
  };

  // Obtener nivel de batería y estado de carga
  exec("cat /sys/class/power_supply/BAT0/capacity", (errorCap, stdoutCap) => {
    if (!errorCap) batteryInfo.batteryLevel = `${stdoutCap.trim()}%`;

    exec(
      "cat /sys/class/power_supply/BAT0/status",
      (errorStatus, stdoutStatus) => {
        if (!errorStatus) batteryInfo.chargingStatus = stdoutStatus.trim();

        // Obtener más información con upower
        exec(
          "upower -i $(upower -e | grep BAT)",
          (errorUpower, stdoutUpower) => {
            if (!errorUpower) {
              const lines = stdoutUpower.split("\n").map((line) => line.trim());

              lines.forEach((line) => {
                if (line.startsWith("energy-full:")) {
                  batteryInfo.energyFull = line.split(":")[1].trim();
                } else if (line.startsWith("energy:")) {
                  batteryInfo.energyNow = line.split(":")[1].trim(); // Usar "energy" en lugar de "energy-now"
                } else if (line.startsWith("energy-rate:")) {
                  batteryInfo.powerNow = line.split(":")[1].trim();
                } else if (
                  line.includes("time to full") ||
                  line.includes("time to empty")
                ) {
                  batteryInfo.estimatedTime = line.split(":")[1].trim();
                }
              });
            }

            res.json(batteryInfo);
          }
        );
      }
    );
  });
};

module.exports = { getBatteryStatus };
