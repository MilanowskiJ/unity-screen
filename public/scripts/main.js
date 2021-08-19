/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * PUT_YOUR_NAME_HERE
 */

/** namespace. */
var unityscreen = unityscreen || {};

/** globals */
unityscreen.FB_COLLECTION_CAMPAIGNS = "campaigns";
unityscreen.FB_COLLECTION_INITIATIVE = "initiative";
unityscreen.FB_COLLECTION_PLAYERS = "players";
unityscreen.FB_KEY_INITIATIVE_NAME = "name";
unityscreen.FB_KEY_INITIATIVE_VALUE = "value";
unityscreen.FB_KEY_PASSIVE_NAMES = "passivesNames";
unityscreen.FB_KEY_PASSIVE_VALUES = "passivesValues";
unityscreen.FB_KEY_SCORE_SKILLS = "scoresNames";
unityscreen.FB_KEY_SCORE_STATS = "scoresStats";
unityscreen.FB_KEY_SCORE_MODIFIERS = "scoresValues";
unityscreen.FB_TEST_UID = "181940146208446";

unityscreen.fbAuthManager = null;

/** function and class syntax examples */
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
}

var on = (function () {
    if (window.addEventListener) {
        return function (target, type, listener) {
            target.addEventListener(type, listener, false);
        };
    }
    else {
        return function (object, sEvent, fpNotify) {
            object.attachEvent("on" + sEvent, fpNotify);
        };
    }
}());

unityscreen.DiceRoller = class {
    constructor() {
        this.history = [];
        this.dice = [];
    }

    addDie(value) {
        this.dice.push(value);
    }

    rollDice() {
        let rolls = [this.rollString];
        let total = 0;

        if (this.dice.length < 1) {
            return 0;
        }

        this.dice.forEach((die) => {
            const rolledValue = this._rollDie(die);
            rolls.push(rolledValue);
            total = total + rolledValue;
        });

        rolls.push(total);

        this.history.push(rolls);

        return total;
    }

    deleteDie(value) {
        let pos = this.dice.indexOf(value);
        if (pos >= 0) {
            this.dice.splice(pos, 1);
        }
    }

    clear() {
        this.dice = [];
    }

    _rollDie(max) {
        return Math.floor(Math.random() * max) + 1;
    }

    get rollString() {
        let ret = "Roll ";
        this.dice.forEach((val) => {
            ret = ret + `d${val} `;
        });
        return ret;
    }
}

unityscreen.InitiativeTracker = class {
    constructor(uid) {
        this._uid = uid;
        this._documentSnapshots = [];
        this._unsubscribe = null;
        this._ref = firebase.firestore().collection(unityscreen.FB_COLLECTION_CAMPAIGNS)
            .doc(this._uid).collection(unityscreen.FB_COLLECTION_INITIATIVE);
        this.currentItem = 0;
    }

    addItem(name, score) {
        this._ref.add({
            [unityscreen.FB_KEY_INITIATIVE_NAME]: name,
            [unityscreen.FB_KEY_INITIATIVE_VALUE]: score
        })
            .then((docRef) => {
                console.log("Document written with ID: ", docRef.id);
            })
            .catch((error) => {
                console.error("Error adding document: ", error);
            });
        this.currentItem = 0;
    }

    next() {
        if (this._documentSnapshots.length > 0) {
            this.currentItem = (this.currentItem + 1) % this._documentSnapshots.length;
        }
    }

    prev() {
        if (this._documentSnapshots.length > 0) {
            this.currentItem = (this.currentItem - 1) % this._documentSnapshots.length;
        }
    }

    beginListening(changeListener) {
        let query = this._ref.orderBy(unityscreen.FB_KEY_INITIATIVE_VALUE, "desc");

        this._unsubscribe = query.onSnapshot((querySnapshot) => {
            this._documentSnapshots = querySnapshot.docs;
            changeListener();
        });
    }

    deleteItem(id) {
        this._ref.doc(id).delete();
    }

    stopListening() {
        this._unsubscribe();
    }

    reset() {
        this._documentSnapshots.forEach((snapshot) => {
            this._ref.doc(snapshot.id).delete();
        });
    }

    itemsList() {
        let l = [];
        console.log("Current Item", this.currentItem);

        for (let i = 0; i < this._documentSnapshots.length; i++) {
            let index = (i + this.currentItem) % this._documentSnapshots.length;
            const snapshot = this._documentSnapshots[index];
            console.log("Index", index);

            l.push(new unityscreen.InitiativeItem(
                snapshot.get(unityscreen.FB_KEY_INITIATIVE_NAME),
                snapshot.id,
                snapshot.get(unityscreen.FB_KEY_INITIATIVE_VALUE)));
        }

        // this._documentSnapshots.forEach((snapshot) => {
        // 	l.push(new unityscreen.InitiativeItem(
        // 		snapshot.get(unityscreen.FB_KEY_INITIATIVE_NAME), 
        // 		snapshot.id, 
        // 		snapshot.get(unityscreen.FB_KEY_INITIATIVE_VALUE)));
        // });

        return l;
    }
}

unityscreen.StatTracker = class {
    constructor(uid) {
        this._uid = uid;
        this._documentSnapshots = [];
        this._unsubscribe = null;
        this._ref = firebase.firestore().collection(unityscreen.FB_COLLECTION_CAMPAIGNS)
            .doc(this._uid).collection(unityscreen.FB_COLLECTION_PLAYERS);
        this.currentStat = 1;
        this.currentStatName = "Acrobatics";
    }

    beginListening(changeListener) {
        let query = this._ref;

        this._unsubscribe = query.onSnapshot((querySnapshot) => {
            this._documentSnapshots = querySnapshot.docs;
            changeListener();
        });
    }

    delete(characterName) {
        this._ref.doc(characterName).delete();
    }

    getCharacterArray() {
        let characters = [];

        if (this._documentSnapshots.length < 1) {
            return characters;
        }

        this._documentSnapshots.forEach(doc => {
            let name = doc.id;

            let passiveNames = doc.get(unityscreen.FB_KEY_PASSIVE_NAMES);
            let passiveValues = doc.get(unityscreen.FB_KEY_PASSIVE_VALUES);
            let passive = 10;

            let skill = doc.get(unityscreen.FB_KEY_SCORE_SKILLS);
            let stat = doc.get(unityscreen.FB_KEY_SCORE_STATS);
            let mod = doc.get(unityscreen.FB_KEY_SCORE_MODIFIERS);

            skill = skill[this.currentStat];
            stat = stat[this.currentStat];
            mod = mod[this.currentStat];

            this.currentStatName = skill;

            console.log(skill, stat, mod);
            if (passiveNames.indexOf(skill) > -1) {
                passive = passiveValues[passiveNames.indexOf(skill)];
            } else {
                passive = 10 + parseInt(mod);
            }

            characters.push(new unityscreen.CharacterItem(name, passive, mod));
        });

        return characters;
    }
}

unityscreen.CharacterItem = class {
    constructor(name, passive, modifier) {
        this.name = name;
        this.passive = passive;
        this.modifier = modifier;
    }
}

unityscreen.InitiativeItem = class {
    constructor(name, id, value) {
        this.name = name;
        this.id = id;
        this.value = value;
    }
}

unityscreen.PageController = class {
    constructor(uid) {
        this.diceRoller = new unityscreen.DiceRoller();
        this.initiativeTracker = new unityscreen.InitiativeTracker(uid);
        this.statTracker = new unityscreen.StatTracker(uid);

        this.statTracker.beginListening(this._updateStatList.bind(this));
        this.initiativeTracker.beginListening(this._updateInitiativeList.bind(this));
        this._initializeDiceRoller();
        window.addEventListener('resize', this._refreshDisplay.bind(this));

        document.getElementById("leaveRoomButton").onclick = () => {
            unityscreen.fbAuthManager.signOut();
        };

        document.querySelectorAll(".popUpButton").forEach((button) => {
            let target = button.dataset.target;
            button.onclick = (event) => {
                document.getElementById(target).style.display = "block";
                document.querySelectorAll(".clearable").forEach((clearable) => {
                    clearable.value = "";
                });
            };
        });

        document.querySelectorAll(".windowCloser").forEach((button) => {
            let target = button.dataset.target;
            button.onclick = (event) => {
                document.getElementById(target).style.display = "none";
            };
        });

        document.querySelectorAll(".statSelector").forEach((button) => {
            on(button, "click", (event) => {
                this.statTracker.currentStat = parseInt(button.dataset.stat);
                this._updateStatList();
            });
        });

        on(document.getElementById("confirmAddInitiative"), "click", (event) => {
            let name = document.getElementById("initiativeAddName").value;
            let value = parseInt(document.getElementById("initiativeAddValue").value);

            this.initiativeTracker.addItem(name, value);
        });

        on(document.getElementById("confirmAddMore"), "click", (event) => {
            let name = document.getElementById("initiativeAddName").value;
            let value = parseInt(document.getElementById("initiativeAddValue").value);

            this.initiativeTracker.addItem(name, value);

            document.querySelectorAll(".clearable").forEach((clearable) => {
                clearable.value = "";
            });
        });

        on(document.getElementById("confirmResetInitiative"), "click", (event) => {
            this.initiativeTracker.reset();
        });

        on(document.getElementById("prevInitiative"), "click", (event) => {
            this.initiativeTracker.prev();
            console.log("prev");
            this._updateInitiativeList();
        });

        on(document.getElementById("nextInitiative"), "click", (event) => {
            this.initiativeTracker.next();
            console.log("next");
            //document.querySelectorAll(".initiativeItem").style.top = "-10px";
            //setTimeout(this._updateInitiativeList.bind(this),1000);
            this._updateInitiativeList();
        });

        on(document.getElementById("confirmLinkStats"), "click", (event) => {
            let file = document.getElementById("fileInput").files[0];
            if (file) {
                let metadata = {
                    customMetadata: {
                        campaign: uid
                    }
                };
                firebase.storage().ref().child(file.name).put(file, metadata);
                document.getElementById("fileInput").value = "";
            } else {
                console.log("No File Selected");
            }
        });

        // let fileInputButton = document.getElementById("fileInput")
        // fileInputButton.addEventListener("change", () => {
        // 	const fileList = fileInputButton.files[0]; /* now you can work with the file list */
        // 	fileList.forEach(file => {
        // 		let metadata = {
        // 			campaign: unityscreen.FB_TEST_UID
        // 		};
        // 		firebase.storage().ref().put(file, metadata);
        // 	});
        // }, false);		
    }
    _initializeDiceRoller() {
        let buttons = document.querySelectorAll(".diceCounter > button");
        buttons.forEach((button) => {
            button.onclick = (event) => {
                let die = parseInt(button.dataset.die);
                if ('true' === button.dataset.add) {
                    this.diceRoller.addDie(die);
                } else {
                    this.diceRoller.deleteDie(die);
                }
                this._refreshDisplay();
            };
        });

        document.getElementById("roll").onclick = (event) => {
            this.diceRoller.rollDice();
            this._refreshDisplay();
        };

        document.getElementById("clear").onclick = (event) => {
            this.diceRoller.clear();
            this._refreshDisplay();
        };
    }
    _updateDiceHistory() {
        //Make New Container
        const newHistoryList = htmlToElement('<div id="historyContainer"></div>');

        //Fill Container
        for (let index = this.diceRoller.history.length - 1; index >= 0; index--) {
            if (this.diceRoller.history.length - index > 20) {
                break;
            }

            const newCard = this._constructHistoryCard(this.diceRoller.history[index]);
            newHistoryList.appendChild(newCard);
        }

        //Remove Old Container
        const oldHistoryList = document.querySelector("#historyContainer");
        oldHistoryList.removeAttribute("id");
        oldHistoryList.hidden = true;

        //Put in new Container
        oldHistoryList.parentElement.append(newHistoryList);

        this._resizeHistory();
    }
    _updateInitiativeList() {
        //Make New Container
        const newInitiativeList = htmlToElement('<div id="initiativeContainer"></div>');

        //Fill Container
        let itemList = this.initiativeTracker.itemsList();

        itemList.forEach((item) => {
            const newCard = this._constructInitiativeCard(item);
            newInitiativeList.appendChild(newCard);
        });

        //Remove Old Container
        const oldInitList = document.querySelector("#initiativeContainer");
        oldInitList.removeAttribute("id");
        oldInitList.hidden = true;

        //Put in new Container
        oldInitList.parentElement.insertBefore(newInitiativeList, document.querySelector("#initButtonContainer"));
        //oldInitList.parentElement.append(newInitiativeList);
    }
    _updateStatList() {
        //Make New Container
        const newStatList = htmlToElement('<div id="statsContainer"></div>');

        //Fill Container
        let statList = this.statTracker.getCharacterArray();

        statList.forEach((item) => {
            const newCard = this._constructStatCard(item);
            newStatList.appendChild(newCard);
        });

        //Remove Old Container
        const oldStatList = document.querySelector("#statsContainer");
        oldStatList.removeAttribute("id");
        oldStatList.hidden = true;

        //Put in new Container
        oldStatList.parentElement.append(newStatList);

        document.getElementById("currentStat").innerHTML = `Passive ${this.statTracker.currentStatName}`;
    }
    _resizeHistory() {
        console.log(document.getElementById("historyWrapper").offsetHeight);
        let h = parseInt(document.getElementById("historyWrapper").offsetHeight);
        h = h - 20;
        document.getElementById("historyContainer").style.height = `${h}px`;
    }
    _manageCharacter(characterName) {
        document.getElementById("deleteCharacterWindow").style.display = "block";
        document.getElementById("characterDeleteTitle").innerHTML = `Delete ${characterName}?`;

        document.getElementById("confirmDeleteCharacter").onclick = () => {
            this.statTracker.delete(characterName);
            document.getElementById("deleteCharacterWindow").style.display = "none";
        }
    }
    _constructStatCard(characterItem) {
        let newCard = htmlToElement(`
            <div class="statItem">
                <div class="statName">${characterItem.name}</div>
                <div class="statScore"><span>(${characterItem.modifier})</span> ${characterItem.passive}</div>
            </div>`);

        newCard.onclick = event => {
            this._manageCharacter(characterItem.name);
        };
        /*
        let newDeleteButton = htmlToElement(`
            <button class="initButton">Delete</button>	
        `);

        newDeleteButton.onclick = (event) => {
            this.initiativeTracker.deleteItem(initItem.id);
        }

        newCard.appendChild(newDeleteButton);
        */
        return newCard;
    }
    _constructInitiativeCard(initItem) {
        let newCard = htmlToElement(`
			<div class="initiativeItem">
				<div class="initName">${initItem.name}</div>
				<div class="initScore">${initItem.value}</div>
			</div>`);

        let newDeleteButton = htmlToElement(`
			<button class="initButton">Delete</button>	
		`);

        newDeleteButton.onclick = (event) => {
            this.initiativeTracker.deleteItem(initItem.id);
        }

        newCard.appendChild(newDeleteButton);
        return newCard;
    }
    _constructHistoryCard(valuesList) {
        const name = valuesList[0];
        const total = valuesList[valuesList.length - 1];
        let values = "";
        for (let i = 1; i < valuesList.length - 1; i++) {
            values = values.concat(`${valuesList[i]} `);
        }
        return htmlToElement(`
			<div class="historyItem">
				<div class="histRoll">${name}</div>
				<div class="histTotal">${total}</div>
				<div class="histValues">${values}</div>
	  		</div>`);
    }
    _refreshDisplay() {
        document.getElementById("roll").innerHTML = this.diceRoller.rollString || "Roll";
        this._updateDiceHistory();
    }
}

unityscreen.LoginPageController = class {
    constructor() {
        console.log("Login Controller Created");

        document.getElementById("loginButton").onclick = (event) => {
            let room = document.getElementById("roomField").value;
            let password = document.getElementById("passwordField").value;

            unityscreen.fbAuthManager.signIn(room, password);
        };

        document.getElementById("newRoomButton").onclick = (event) => {
            let room = document.getElementById("roomField").value;
            let password = document.getElementById("passwordField").value;

            unityscreen.fbAuthManager.register(room, password);
        };
    }
}

unityscreen.FbAuthManager = class {
    constructor() {
        this._user = null;
    }
    beginListening(changeListener) {
        firebase.auth().onAuthStateChanged((user) => {
            this._user = user;
            changeListener();
        });
    }
    signIn(room, password) {
        if (room != "" && password != "") {
            firebase.auth().signInWithEmailAndPassword(`${room}@yourowndomain.com`, password)
                .catch((error) => {
                    var errorCode = error.code;
                    var errorMessage = error.message;
                });
        }
    }
    register(room, password) {
        firebase.auth().createUserWithEmailAndPassword(`${room}@yourowndomain.com`, password)
            .catch((error) => {
                var errorCode = error.code;
                var errorMessage = error.message;
                // ..
            });
    }
    signOut() {
        firebase.auth().signOut().catch(function () {
            console.log("Sign Out Error");
        });
    }
    get isSignedIn() { return !!this._user; }
    get uid() { return this._user.uid; }
}

unityscreen.checkForRedirects = () => {
    if (document.querySelector("#loginPage") && unityscreen.fbAuthManager.isSignedIn) {
        window.location.href = "/index.html"
    }
    if (!document.querySelector("#loginPage") && !unityscreen.fbAuthManager.isSignedIn) {
        window.location.href = "/login.html"
    }
};

unityscreen.initializePage = () => {
    if (document.querySelector("#mainPage")) {
        new unityscreen.PageController(unityscreen.fbAuthManager.uid);
    }

    if (document.querySelector("#loginPage")) {
        new unityscreen.LoginPageController();
    }
};

/* Main */
/** function and class syntax examples */
unityscreen.main = function () {
    console.log("Ready");
    unityscreen.fbAuthManager = new unityscreen.FbAuthManager();
    unityscreen.fbAuthManager.beginListening(params => {
        unityscreen.checkForRedirects();
        unityscreen.initializePage();
    });
};

unityscreen.main();
