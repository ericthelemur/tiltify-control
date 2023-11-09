// Helper function to create nested div structure
// Many JS frameworks have similar, but keeping no dependencies
function createElem(tag, classes = [], content = undefined, post_hook = undefined, children = []) {
    const elem = document.createElement(tag);
    for (const c of classes) {
        elem.classList.add(c);
    }
    if (content) elem.innerText = content;
    for (const ch of children) {
        elem.appendChild(ch);
    }
    if (post_hook) post_hook(elem);
    return elem;
}

// Display formats
const displayCurrFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: nodecg.bundleConfig.displayCurrency });
const baseCurrFormat = (curr) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });
const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "short", month: "short" })

function getAmount(currency, value, disp) {
    // Format value for display
    const c1 = baseCurrFormat(currency).format(value);
    if (currency == nodecg.bundleConfig.displayCurrency || disp === undefined) {
        return [c1, undefined]
    }
    return [c1, displayCurrFormat.format(disp)]
}

function enableAllButtons(state) {
    buttonGroups.forEach((btnGroup) =>
        [].forEach.call(btnGroup.children, (e) => e.disabled = state)
    )
}

const donoElem = document.getElementById("donations");
const resetElem = document.getElementById("reset");
const autoApproveElem = document.getElementById("auto-approve");

// Auto disable buttons on change
var timeout;
function tempDisableButtons() {
    enableAllButtons(true);
    clearTimeout(timeout);
    timeout = setTimeout(() => enableAllButtons(false), 500);
}
var mutationObserver = new MutationObserver(tempDisableButtons);
mutationObserver.observe(donoElem, { childList: true, attributeFilter: ["display"] })



// Find url params or generate default
const url = new URL(window.location.href);
const params = url.searchParams;

function setParam(prefix, key, value, exclusive) {
    if (!exclusive) {
        if (value) params.append(prefix, key);
        else params.delete(prefix, key);
    } else {
        params.delete(prefix);
        params.set(prefix, key);
    }
    history.replaceState(null, null, url.href);
}


class SettingsCategory {
    constructor(name, options, onclick, defaultVal = [], exclusive = false) {
        this.options = options;
        this.name = name;
        this.onclick = onclick;
        this.defaultVal = defaultVal;
        this.exclusive = exclusive;
        this.onchange = [];

        // Set default params if none then fetch
        if (!params.has(name)) defaultVal.forEach((v) => params.append(name, v));
        const catParams = params.getAll(name);
        this.elems = {};

        for (const key of options) {
            // Record element and set checked status
            const elem = document.getElementById(`${name}-${key}`);
            this.elems[key] = elem;
            elem.checked = catParams.includes(key);

            // On click trigger event, disable buttons and set param
            elem.addEventListener("click", (e) => {
                this.onclick(key, elem);
                tempDisableButtons();
                setParam(name, key, elem.checked, exclusive);
                this.onchange.forEach(f => f(this));
            });
        }
    }

    enable(val = true) {
        for (const [option, elem] of Object.entries(this.elems)) {
            elem.disabled = !val;
        }
    }

    addOnChange(func) {
        this.onchange.push(func);
    }
}

const icons = { "unread": "envelope-open-fill", "read": "envelope-fill", "approved": "check-lg", "undecided": "question-lg", "censored": "ban", "shown": "eye-fill", "unshown": "eye-slash-fill" }
const localSettings = {
    "list": new SettingsCategory("list", ["live", "all", "donors"], () => updateDonoList(undefined), ["live"], true),
    "show": new SettingsCategory("show", ["unread", "read", "approved", "undecided", "censored"], (k, e) => donoElem.dataset[k] = e.checked, ["unread", "approved", "undecided"], false),
    "order": new SettingsCategory("order", ["asc", "dsc"], resort, ["dsc"], true),
    "sort": new SettingsCategory("sort", ["time", "money"], resort, ["time"], true)
}
Object.entries(localSettings.show.elems).forEach(([k, e]) => donoElem.dataset[k] = e.checked);
localSettings.list.addOnChange((list) => {
    const v = list.elems.live.checked;
    localSettings.show.enable(v);
    localSettings.order.enable(v);
    localSettings.sort.enable(v);
})
history.replaceState(null, null, url.href);

resetElem.addEventListener("click", () => {
    const url = new URL(window.location.origin + window.location.pathname);
    const newParams = url.searchParams;
    newParams.append("key", params.get("key"));
    for (const [name, cat] of Object.entries(localSettings)) {
        for (const option of cat.defaultVal) {
            newParams.append(name, option);
        }
    }
    window.location.href = url.href;
})


function createIcon(icon, label = undefined) {
    // Create a Bootstrap icon with optional text
    const i = [createElem("i", ["bi", "bi-" + icon])];
    if (label) i.push(createElem("span", [], " " + label))
    return i;
}

function createButton(toggle, textTrue, iconTrue, textFalse, iconFalse, onclick = undefined, classes = []) {
    // Create toggle button with icon & text
    const button = createElem("button", ["btn", toggle ? "btn-primary" : "btn-outline-primary"], undefined, undefined,
        createIcon(toggle ? iconTrue : iconFalse, toggle ? textTrue : textFalse)
    );
    if (onclick) button.addEventListener("click", onclick);
    classes.forEach((c) => button.classList.add(c));
    return button;
}

function renderDonation(dono) {
    const amount = getAmount(dono.amount.currency, dono.amount.value, dono.amountDisplay);
    const date = new Date(dono.completed_at);
    const cardClasses = ["card", dono.read ? "read" : "unread", tripleState(dono.modStatus, "approved", "undecided", "censored")];
    return createElem("div", cardClasses, undefined, (e) => {
        e.id = "dono-" + dono.id;
        e.dataset.time = -Math.trunc(new Date(dono.completed_at).getTime());
        e.dataset.money = Math.round(dono.amountDisplay * 100);
    }, [
        createElem("div", ["card-body"], undefined, undefined, [
            // Title with donor and amounts
            createElem("h2", ["h5", "card-title"], undefined,
                (e) => { if (dono.shown) e.prepend(createIcon("eye-fill")) },
                [
                    createElem("span", ["name"], dono.donor_name),
                    createElem("span", ["donated"], " donated "),
                    createElem("span", ["amount"], amount[0]),
                    createElem("span", ["amount", "amount-gbp"], amount[1] ? ` (${amount[1]})` : ""),
                ]),
            // Donation body
            // Subtitle
            createElem("small", ["datetime", "card-subtitle", "text-body-tertiary"], undefined, undefined, [
                createElem("span", ["time"], timeFormat.format(date)),
                createElem("span", [], " "),
                createElem("span", ["date"], dateFormat.format(date)),
                createElem("div", ["statuses", "d-inline-flex", "gap-2", "ms-2"], undefined, undefined, "read" in dono ? [
                    ...createIcon(dono.read ? icons.read : icons.unread),
                    ...createIcon(dono.shown ? icons : icons.unshown),
                    ...createIcon(tripleState(dono.modStatus, icons.approved, icons.undecided, icons.censored))
                ] : [])
            ]),
            createElem("p", ["message", "card-text"], dono.donor_comment || "No Message"),
            localSettings.list.elems.live.checked ? createButtons(dono) : createElem("span", []),
        ])
    ]);
}

function renderDonor(donor) {
    const amount = getAmount(donor.amount.currency, donor.amount.value, donor.amountDisplay);
    const donos = perDonorDonations[donor.name];
    const donoElems = (donos ? donos : []).map(renderDonation)
    return createElem("div", ["card", "w-100"], undefined, (e) => {
        e.id = "dono-" + donor.id;
        e.dataset.money = Math.round(donor.amount.value * 100);
    }, [
        createElem("div", ["card-body"], undefined, undefined, [
            // Title with donor and amounts
            createElem("details", [], undefined, undefined, [
                createElem("summary", [], undefined, undefined, [
                    createElem("h2", ["h5", "card-title", "d-inline"], undefined, undefined, [
                        createElem("span", ["name"], donor.name),
                        createElem("span", ["donated"], " total "),
                        createElem("span", ["amount"], amount[0]),
                        createElem("span", ["amount", "amount-gbp"], amount[1] ? ` (${amount[1]})` : ""),
                    ]),
                ]),
                createElem("div", ["donations"], undefined, undefined, donoElems)
            ])
        ])
    ]);
}

var existing = [];
var readMsg = [];
var perDonorDonations = {};
function updateDonoList(newvalue = undefined) {
    const listElems = localSettings.list.elems;
    // This can be triggered with on change or generally
    if (newvalue === undefined) {
        if (listElems.live.checked) newvalue = donationRep.value;
        else if (listElems.all.checked) newvalue = allDonationRep.value;
        else /*if (listElems.donors.checked)*/ newvalue = donorsRep.value;
    }

    console.log("Updating", newvalue)
    timerButtons = [];
    buttonGroups = [];

    var newdonos = [];
    if (newvalue.length == 0) newdonos = [createElem("h2", undefined, "No donations yet")]

    if (listElems.donors.checked) donoElem.classList.add("d-block")
    else donoElem.classList.remove("d-block")

    for (var dono of newvalue) {
        newdonos.push(listElems.donors.checked ? renderDonor(dono) : renderDonation(dono));
    }
    resort(newdonos);
}

function resort(children = undefined) {
    const factor = localSettings.order.elems.asc.checked ? 1 : -1;
    const donos = Array.from(children === undefined ? donoElem.children : children);
    const attr = localSettings.sort.elems.money.checked ? "money" : "time";
    donos.sort((a, b) => factor * (a.dataset[attr] - b.dataset[attr]))
    donoElem.replaceChildren(...donos);
}

NodeCG.waitForReplicants(settingsRep, donationRep, allDonationRep, donorsRep).then(() => {
    updateDonoList();
    // Update dono list on donation coming in
    donationRep.on("change", function (newvalue, oldvalue) {
        if (localSettings.list.elems.live.checked && newvalue !== undefined && (oldvalue === undefined || JSON.stringify(newvalue) !== JSON.stringify(oldvalue))) {
            updateDonoList(newvalue);
        }
    });

    allDonationRep.on("change", function (newvalue, oldvalue) {
        if (newvalue !== undefined && (oldvalue === undefined || JSON.stringify(newvalue) !== JSON.stringify(oldvalue))) {
            if (localSettings.list.elems.all.checked) updateDonoList(newvalue);
            perDonorDonations = {};
            for (const dono of newvalue) {
                const key = dono.donor_name;
                if (!(key in perDonorDonations)) perDonorDonations[key] = [];
                perDonorDonations[key].push(dono);
            }
        }
    });

    donorsRep.on("change", function (newvalue, oldvalue) {
        if (localSettings.list.elems.donors.checked && newvalue !== undefined && (oldvalue === undefined || JSON.stringify(newvalue) !== JSON.stringify(oldvalue))) {
            updateDonoList(newvalue);
        }
    });

    settingsRep.on("change", function (newvalue, oldvalue) {
        if (newvalue && autoApproveElem.checked != newvalue.autoapprove) {
            autoApproveElem.checked = newvalue.autoapprove;
        }
    });

    autoApproveElem.addEventListener("click", () => {
        if (autoApproveElem.checked != settingsRep.value.autoapprove) {
            settingsRep.value.autoapprove = autoApproveElem.checked;
        }
    })
    // autoApproveElem.disabled = false;


    const clearDonosElem = document.getElementById("clear-donations");
    clearDonosElem.addEventListener("click", () => {
        var confirmClear = confirm("Are you sure you want to clear all donations for all readers?")
        if (confirmClear == true) {
            nodecg.sendMessageToBundle('clear-donations', 'nodecg-tiltify');
        }
    })

    const approveAllElem = document.getElementById("approve-all");
    approveAllElem.addEventListener("click", () => {
        var confirmClear = confirm("Are you sure you want to mark all unmoderated donations approved?")
        if (confirmClear == true) {
            for (const dono of donationRep.value) {
                if (dono.modStatus === UNDECIDED) {
                    dono.modStatus = APPROVED;
                }
            }
        }
    })

})
