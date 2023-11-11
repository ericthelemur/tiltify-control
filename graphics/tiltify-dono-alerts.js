const displayCurrFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: nodecg.bundleConfig.displayCurrency });

var donationRep = nodecg.Replicant("donations", "nodecg-tiltify");

const toastsElem = document.getElementById("toasts");

function toast(dono) {
    const elem = createElem("div", ["toast"], undefined, undefined, [
        createElem("div", ["toast-body"], undefined, undefined, [
            createElem("h6", [], undefined, undefined, [
                createIcon("piggy-bank-fill"),
                createElem("b", [], dono.donor_name),
                createElem("span", ["donated"], " donated "),
                createElem("b", [], displayCurrFormat.format(dono.amountDisplay))
            ]),
            createElem("div", ["msg"], dono.donor_comment)
        ])
    ])
    elem.style.height = "0px";
    toastsElem.appendChild(elem);

    // Start grow anim
    setTimeout(() => {
        elem.classList.add("show")
        elem.style.height = elem.firstChild.clientHeight + "px";
    }, 100);

    // Start shrink anim
    setTimeout(() => {
        elem.classList.remove("show");
        elem.style.height = "0px";
        setTimeout(() => elem.remove(), 210);
    }, 5000);

    dono.shown = true;
}

donationRep.on("change", (newval) => {
    newval.filter(d => !d.shown && d.modStatus === true).forEach(toast);
})
