const { exec } = require("child_process");

const getBatteryStatus = (req, res) => {
  let batteryInfo = {};

  // Obtener nivel de batería
  exec("cat /sys/class/power_supply/BAT0/capacity", (errorCap, stdoutCap) => {
    if (!errorCap) {
      batteryInfo.batteryLevel = `${stdoutCap.trim()}%`;
    } else {
      batteryInfo.batteryLevel = "No disponible";
    }

    // Obtener estado de carga
    exec(
      "cat /sys/class/power_supply/BAT0/status",
      (errorStatus, stdoutStatus) => {
        if (!errorStatus) {
          batteryInfo.chargingStatus = stdoutStatus.trim();
        } else {
          batteryInfo.chargingStatus = "No disponible";
        }

        // Obtener energía actual
        exec(
          "cat /sys/class/power_supply/BAT0/energy_now",
          (errorEnergyNow, stdoutEnergyNow) => {
            if (!errorEnergyNow) {
              batteryInfo.energyNow = `${
                parseInt(stdoutEnergyNow.trim(), 10) / 1_000_000
              } Wh`;
            } else {
              batteryInfo.energyNow = "No disponible";
            }

            // Obtener energía máxima
            exec(
              "cat /sys/class/power_supply/BAT0/energy_full",
              (errorEnergyFull, stdoutEnergyFull) => {
                if (!errorEnergyFull) {
                  batteryInfo.energyFull = `${
                    parseInt(stdoutEnergyFull.trim(), 10) / 1_000_000
                  } Wh`;
                } else {
                  batteryInfo.energyFull = "No disponible";
                }

                // Obtener potencia de carga/descarga
                exec(
                  "cat /sys/class/power_supply/BAT0/power_now",
                  (errorPower, stdoutPower) => {
                    if (!errorPower) {
                      batteryInfo.powerNow = `${
                        parseInt(stdoutPower.trim(), 10) / 1_000_000
                      } W`;
                    } else {
                      batteryInfo.powerNow = "No disponible";
                    }

                    // Enviar la respuesta con los datos obtenidos
                    res.json(batteryInfo);
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

module.exports = { getBatteryStatus };
