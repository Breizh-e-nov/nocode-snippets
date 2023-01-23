const BaseSpecificNames = {
    // Reservations Table
    reservationsTable: "Affectations véhicules", // name of the [RESERVATIONS] table
    assetField: "Véhicules", // name of the link-type field connecting to the [ASSETS] table
    startField: "Heure début",
    endField: "Heure fin",
    personField: "Prestation", // name of the link-type field connection to the [PEOPLE] table

    // Assets Table
    assetsTable: "Véhicules", // name of the [ASSETS] table
    assetName: "Id", // name of the primary field in the [ASSETS] table

    // People Table
    peopleTable: "Prestations", // name of the [PEOPLE] table
    peopleName: "Id" // name of the primary field in the [PEOPLE] table
}

// End BASE SPECIFIC NAMES Section (everything below should work without the need for further adjustment.)


output.markdown(`# Affecter un(e) ${BaseSpecificNames.assetField}`);

const peopleTable = base.getTable(BaseSpecificNames.peopleTable);

let person = await input.recordAsync("Affecter un(e) " + BaseSpecificNames.assetField + " à :", peopleTable, {shouldAllowCreatingRecord: true});

const startDate = person.getCellValueAsString("Heure prêt sur place");
const endDate = person.getCellValueAsString("Heure de fin");
output.markdown(`> Cet événement se déroule de ${startDate} à ${endDate}`);

const startDateRaw = person.getCellValue("Heure prêt sur place");
const endDateRaw = person.getCellValue("Heure de fin");

const reservationsTable = base.getTable(BaseSpecificNames.reservationsTable);

let result = await reservationsTable.selectRecordsAsync();

let allReservations = result.records;

let conflicts = [];

for (var i = 0; i < allReservations.length; i++) {
    let compareStart = new Date(allReservations[i].getCellValue(BaseSpecificNames.startField)).toISOString();
    let compareEnd = new Date(allReservations[i].getCellValue(BaseSpecificNames.endField)).toISOString();

    if ((startDateRaw >= compareStart && endDateRaw <= compareEnd) || (startDateRaw <= compareStart && endDateRaw >= compareEnd)) {
        conflicts.push(allReservations[i].id);
    };
}

let unavailableAssets = [];

for (var i = 0; i < conflicts.length; i++) {
    let reservation = result.getRecord(conflicts[i]);
    let assets = reservation.getCellValue(BaseSpecificNames.assetField);
    unavailableAssets = [...unavailableAssets, ...assets.map(item => item.name)];
};
// Output a table of Unavailable Assets
/*if (unavailableAssets.length >0) {
    output.markdown(`### Unavailable ${BaseSpecificNames.assetField}`);
    output.table(unavailableAssets);
}*/

const assetsTable = base.getTable(BaseSpecificNames.assetsTable);

const assets = await assetsTable.selectRecordsAsync({sorts: [{field: BaseSpecificNames.assetName}]});

let availableAssets = assets.records.filter(record => {
    let assetName = record.getCellValue(BaseSpecificNames.assetName);
    return assetName !== null && ! unavailableAssets.includes(assetName);
});

if (availableAssets.length >0) {

    //Output a table of availableAssets
    /*output.markdown(`#### Available ${BaseSpecificNames.assetField}`);
    output.table(availableAssets);*/
    
    
    let selectedAsset = await input.recordAsync("Choix du " + BaseSpecificNames.assetField + ":", availableAssets);
    
    if (selectedAsset) {

        const matchingReservationFound = allReservations.find(reservation => {
            let compareStart = new Date(reservation.getCellValue(BaseSpecificNames.startField)).toISOString();
            let compareEnd = new Date(reservation.getCellValue(BaseSpecificNames.endField)).toISOString();
            return (startDateRaw == compareStart) && (endDateRaw == compareEnd);
        });

        output.markdown(`Vous allez affecter **${selectedAsset.name}** à la prestation **${person.name}** (de **${new Date(startDateRaw).toLocaleTimeString()}** à **${new Date(endDateRaw).toLocaleTimeString()}**)`);

        let confirmed = await input.buttonsAsync('',[{label: 'Confirmer affectation', value: 'true', variant: 'primary'}]);

        if (confirmed) {
            if (matchingReservationFound) {
                await reservationsTable.updateRecordAsync(matchingReservationFound.id, {
                    [BaseSpecificNames.assetField]: [
                        ...matchingReservationFound.getCellValue(BaseSpecificNames.assetField),
                        { id: selectedAsset.id }
                    ]
                })
            }
            else {
                await reservationsTable.createRecordAsync({
                    [BaseSpecificNames.assetField]: [{id: selectedAsset.id}],
                    [BaseSpecificNames.personField]: [{id: person.id}],
                    [BaseSpecificNames.startField]: startDateRaw,
                    [BaseSpecificNames.endField]: endDateRaw,
                    [BaseSpecificNames.posteField]: {name: poste}
                })
            }
            output.markdown(`*Votre affectation a été prise en compte.*`)
        }
    } else {
        output.markdown(`#### Aucun(e) ${BaseSpecificNames.assetField} n'a été sélectionné(e). Veuillez réessayer en sélectionnant un(e) ${BaseSpecificNames.assetField}.`)
    }
}

else {
    output.markdown(`#### Malheureusement, il n'y a aucun(e) ${BaseSpecificNames.assetsTable} pour ce créneau.`)
}