const { exec } = require("child_process");

const getBatteryStatus = (req, res) => {
  // Ejecutar comando para obtener el nivel de batería
  exec("cat /sys/class/power_supply/BAT0/capacity", (errorCap, stdoutCap) => {
    if (errorCap) {
      return res
        .status(500)
        .json({ error: "No se pudo obtener el nivel de batería" });
    }

    // Ejecutar comando para obtener el estado de carga
    exec(
      "cat /sys/class/power_supply/BAT0/status",
      (errorStatus, stdoutStatus) => {
        if (errorStatus) {
          return res
            .status(500)
            .json({ error: "No se pudo obtener el estado de carga" });
        }

        // // Obtener la energía actual de la batería
        // exec(
        //   "cat /sys/class/power_supply/BAT0/energy_now",
        //   (errorEnergyNow, stdoutEnergyNow) => {
        //     if (errorEnergyNow) {
        //       return res
        //         .status(500)
        //         .json({ error: "No se pudo obtener la energía actual" });
        //     }

        //     // Obtener la energía máxima de la batería
        //     exec(
        //       "cat /sys/class/power_supply/BAT0/energy_full",
        //       (errorEnergyFull, stdoutEnergyFull) => {
        //         if (errorEnergyFull) {
        //           return res
        //             .status(500)
        //             .json({ error: "No se pudo obtener la energía máxima" });
        //         }

        //         // Obtener la potencia actual (si se está cargando o descargando)
        //         exec(
        //           "cat /sys/class/power_supply/BAT0/power_now",
        //           (errorPower, stdoutPower) => {
        //             if (errorPower) {
        //               return res
        //                 .status(500)
        //                 .json({ error: "No se pudo obtener la potencia" });
        //             }

        //             res.json({
        //               batteryLevel: `${stdoutCap.trim()}%`,
        //               chargingStatus: stdoutStatus.trim(), // "Charging", "Discharging", "Full"
        //               energyNow: `${
        //                 parseInt(stdoutEnergyNow.trim(), 10) / 1_000_000
        //               } Wh`, // Convertido a Wh
        //               energyFull: `${
        //                 parseInt(stdoutEnergyFull.trim(), 10) / 1_000_000
        //               } Wh`, // Convertido a Wh
        //               powerNow: `${
        //                 parseInt(stdoutPower.trim(), 10) / 1_000_000
        //               } W`, // Convertido a W
        //             });
        //           }
        //         );
        //       }
        //     );
        //   }
        // );
        res.json({
          batteryLevel: `${stdoutCap.trim()}%`,
          chargingStatus: stdoutStatus.trim(), // "Charging", "Discharging", "Full"
        });
      }
    );
  });
};

module.exports = { getBatteryStatus };
