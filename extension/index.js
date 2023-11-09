module.exports = function (nodecg) {
    function equivListOfObjects(list1, list2) {
        if (list1 === list2) return true;
        if (list1.length != list2.length) return false;
        if (list1.every((v, i) => v === list2[i])) return true;
        return JSON.stringify(list1) === JSON.stringify(list2);
    }

    const approvedDonationsRep = nodecg.Replicant("approvedDonations", { persistent: true, defaultValue: [] });
    const settingsRep = nodecg.Replicant("settings", { persistent: true, defaultValue: { "autoapprove": false } });
    const donationsRep = nodecg.Replicant("donations", "nodecg-tiltify");

    var conversionRates = {};

    function convertAmount(dono) {
        console.log("Converting", dono.id);
        if (conversionRates && dono.amount.currency in conversionRates) {
            dono.amountDisplay = dono.amount.value / conversionRates[dono.amount.currency]
        } else if (dono.amount.currency == nodecg.bundleConfig.displayCurrency) {
            // If rates not provided, can do trivial conversion
            dono.amountDisplay = dono.amount.value
        }
    }

    function convertAmounts() {
        nodecg.log.info("Converting rates");
        for (var dono of donationsRep.value) {
            if (dono.amountDisplay === undefined) {
                convertAmount(dono);
            }
        }
    }

    fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${nodecg.bundleConfig.conversionRateKey}&base_currency=${nodecg.bundleConfig.displayCurrency}`)
        .then((r) => r.json())
        .then((j) => {
            conversionRates = j.data;
            nodecg.log.info("Conversion rates loaded, converting");
            convertAmounts();
        });

    const nodecgTiltify = nodecg.extensions['nodecg-tiltify'];
    nodecgTiltify.newDonoHooks.push(convertAmount);

    nodecgTiltify.newDonoHooks.push(dono => {
        if (!settingsRep.value.autoapprove) {
            nodecg.log.info("Clearing ToA");
            if (dono.timeToApprove != 8.64e15) {
                dono.timeToApprove = 8.64e15;
            }
        } else {    // Blacklist, mark auto approval time
            nodecg.log.info("Setting ToA");
            const now = Date.now();
            // Don't countdown if just booting
            dono.timeToApprove = now + nodecg.bundleConfig.autoApproveTimeSec * 1000;
        }
    })

    // On launch, don't let any auto approve
    for (const dono of donationsRep.value) {
        dono.timeToApprove = 8.64e15;
    }


    // If blacklist, poll for the approval time passing
    setInterval(() => {
        if (settingsRep.value.autoapprove) {
            const now = Date.now();
            for (const dono of donationsRep.value) {
                if (dono.modStatus === undefined && dono.timeToApprove < now) {
                    nodecg.log.info(`Donation ${dono.id} marked as approved as time has passed`);
                    dono.modStatus = true;
                }
            }
        }
    }, 1000)
};
