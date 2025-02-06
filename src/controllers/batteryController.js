const { exec } = require("child_process");

const getBatteryStatus = (req, res) => {
  let batteryInfo = {};

  // Obtener nivel de batería
  exec("cat /sys/class/power_supply/BAT0/capacity", (errorCap, stdoutCap) => {
    batteryInfo.batteryLevel = errorCap
      ? "No disponible"
      : `${stdoutCap.trim()}%`;

    // Obtener estado de carga
    exec(
      "cat /sys/class/power_supply/BAT0/status",
      (errorStatus, stdoutStatus) => {
        batteryInfo.chargingStatus = errorStatus
          ? "No disponible"
          : stdoutStatus.trim();

        // Obtener más información con upower
        exec(
          "upower -i $(upower -e | grep BAT) | grep -E 'energy|power|time to'",
          (errorUpower, stdoutUpower) => {
            if (!errorUpower) {
              const lines = stdoutUpower.split("\n").map((line) => line.trim());

              lines.forEach((line) => {
                if (line.includes("energy-full:")) {
                  batteryInfo.energyFull = line.split(":")[1].trim();
                } else if (line.includes("energy-now:")) {
                  batteryInfo.energyNow = line.split(":")[1].trim();
                } else if (line.includes("power:")) {
                  batteryInfo.powerNow = line.split(":")[1].trim();
                } else if (
                  line.includes("time to full") ||
                  line.includes("time to empty")
                ) {
                  batteryInfo.estimatedTime = line.split(":")[1].trim();
                }
              });
            } else {
              batteryInfo.energyFull = "No disponible";
              batteryInfo.energyNow = "No disponible";
              batteryInfo.powerNow = "No disponible";
              batteryInfo.estimatedTime = "No disponible";
            }

            // Enviar la respuesta con los datos obtenidos
            res.json(batteryInfo);
          }
        );
      }
    );
  });
};

module.exports = { getBatteryStatus };
