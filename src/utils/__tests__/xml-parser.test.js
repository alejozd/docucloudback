const { parseFSEXml } = require('../xml-parser');

describe('xml-parser', () => {
  describe('parseAircraft', () => {
    it('should correctly parse aircraft data from FSEconomy XML', async () => {
      const xml = `
<AircraftItems>
    <Aircraft>
        <Registration>N12345</Registration>
        <MakeModel>Cessna 172 Skyhawk</MakeModel>
        <Owner>alejozd</Owner>
        <Location>SKBO</Location>
        <LocationName>El Dorado Intl</LocationName>
        <Home>SKBO</Home>
        <FuelPct>0.88</FuelPct>
        <EngineTime>1783:45</EngineTime>
        <AirframeTime>1783:45</AirframeTime>
        <TimeLast100hr>59:14</TimeLast100hr>
        <SalePrice>0.00</SalePrice>
        <SellbackPrice>0.00</SellbackPrice>
        <RentalDry>0.00</RentalDry>
        <RentalWet>0.00</RentalWet>
        <RentalType>Dry</RentalType>
        <Bonus>0.00</Bonus>
        <MonthlyFee>0.00</MonthlyFee>
        <FeeOwed>0.00</FeeOwed>
        <Equipment>VFR</Equipment>
        <NeedsRepair>0</NeedsRepair>
        <RentedBy>None</RentedBy>
        <LeasedFrom>None</LeasedFrom>
        <SerialNumber>123456</SerialNumber>
    </Aircraft>
</AircraftItems>`;

      const result = await parseFSEXml(xml, 'aircraft');

      expect(result).toHaveLength(1);
      const ac = result[0];

      // Check for new/fixed fields
      expect(ac.fuelLevel).toBe(88);
      expect(ac.fuelPctRaw).toBe(0.88);
      expect(ac.engineTimeRaw).toBe('1783:45');
      expect(ac.engineHours).toBeCloseTo(1783.75);
      expect(ac.timeLast100hrRaw).toBe('59:14');
      expect(ac.hoursTo100Hr).toBeCloseTo(59.233, 3);

      // Check for other fields
      expect(ac.registration).toBe('N12345');
      expect(ac.makeModel).toBe('Cessna 172 Skyhawk');
      expect(ac.location).toBe('SKBO');
    });
  });
});
