const { exec } = require("child_process");

const getBatteryStatus = (req, res) => {
  let batteryInfo = {
    batteryLevel: "No disponible",
    chargingStatus: "No disponible",
    energyFull: "No disponible",
    energyNow: "No disponible",
    designCapacity: "No disponible",
    lastFullCapacity: "No disponible",
  };

  // Obtener nivel de batería y estado de carga
  exec("cat /sys/class/power_supply/BAT0/capacity", (errorCap, stdoutCap) => {
    if (!errorCap) batteryInfo.batteryLevel = `${stdoutCap.trim()}%`;

    exec(
      "cat /sys/class/power_supply/BAT0/status",
      (errorStatus, stdoutStatus) => {
        if (!errorStatus) batteryInfo.chargingStatus = stdoutStatus.trim();

        // Obtener información con upower
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
                }
              });
            }

            // Obtener información de acpi -i
            exec("acpi -i", (errorAcpi, stdoutAcpi) => {
              if (!errorAcpi) {
                const acpiLines = stdoutAcpi.split("\n");

                acpiLines.forEach((line) => {
                  if (line.includes("design capacity")) {
                    batteryInfo.designCapacity =
                      line.match(/design capacity (\d+ mAh)/)?.[1] ||
                      "No disponible";
                  }
                  if (line.includes("last full capacity")) {
                    batteryInfo.lastFullCapacity =
                      line.match(/last full capacity (\d+ mAh)/)?.[1] ||
                      "No disponible";
                  }
                });
              }

              res.json(batteryInfo);
            });
          }
        );
      }
    );
  });
};

module.exports = { getBatteryStatus };
