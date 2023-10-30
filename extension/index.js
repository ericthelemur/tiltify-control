module.exports = function (nodecg) {
    var conversionRates = {};

    function convertAmounts() {
        for (var dono of donationsRep.value) {
            if (dono.amountDisplay === undefined && conversionRates && dono.amount.currency in conversionRates) {
                dono.amountDisplay = dono.amount.value / conversionRates[dono.amount.currency]
            }
        }
    }

    fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${nodecg.bundleConfig.conversionRateKey}&base_currency=${nodecg.bundleConfig.displayCurrency}`)
        .then((r) => r.json())
        .then((j) => {
            conversionRates = j.data;
            console.log(conversionRates);
            convertAmounts();
        });

    var donationsRep = nodecg.Replicant("donations", "nodecg-tiltify");
    donationsRep.on("change", (newval) => {
        console.log("changed donations", newval);
        convertAmounts();
    })
};
