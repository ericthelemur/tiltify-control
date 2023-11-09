const displayCurrFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: nodecg.bundleConfig.displayCurrency });

var donationRep = nodecg.Replicant("donations", "nodecg-tiltify");

const toastsElem = document.getElementById("toasts");

function toast(dono) {
    const elem = createElem("div", ["toast"], undefined, undefined, [
        createElem("div", ["toast-header"], undefined, undefined, [
            createElem("h2", [], undefined, undefined, [
                ...createIcon("piggy-bank-fill"),
                createElem("b", [], dono.donor_name),
                createElem("span", ["donated"], " donated "),
                createElem("b", ["me-auto"], displayCurrFormat.format(dono.amountDisplay))
            ])
        ]),
        createElem("div", ["toast-body"], dono.donor_comment)
    ])
    toastsElem.appendChild(elem);
    const toast = bootstrap.Toast.getOrCreateInstance(elem);
    toast.show();
    dono.shown = true;
}

donationRep.on("change", (newval) => {
    newval.filter(d => !d.shown && d.modStatus === true).forEach(toast);
})
