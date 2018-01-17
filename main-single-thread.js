const puppeteer = require('puppeteer');

(async () => {
    /*
    Initialisation du navigateur :
    - constantes (browser, pages)
    - variables (url, json)
    - load de l'url de départ
    - comportements quant aux pop-up...
    */
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    var url = 'https://web.bankin.com/challenge/index.html?start=0';
    var json = {transaction: [], account: [], amount: [], currency: []};
    var hasToWork = true;
    var time = Date.now();

    page.on('console', function(data) {
        var split = data.text.split(' ');
        if (split[0] == 'log') {
            console.log(data.text);
        } else if (split[0] == 'save') {
            json.account.push(split[1]);
            json.transaction.push(split[2]);
            json.amount.push(split[3]);
            json.currency.push(split[4]);
        }
    });
    page.on('dialog', async dialog => {
        // console.log(dialog.message());
        await dialog.dismiss();
    });

    await page.goto(url);

    /*
    Logique inhérente au scrapping
    Routine désigne une fonction qui fonctionne de la manière suivante :
    - si il n'y a pas de tableau ni dans document ni dans iframe
        - si il n'y a pas de bouton reload, on retourne "reload" et on recharge
        - si il y a un bouton reload, on clique jusqu'à qu'il y ait le tableau
        - si cela ne fonctionne pas après 25 essais, on reload
    - si il y a le tableau dans :
        - document : on parcourt le document
        - iframe : on parcourt l'iframe...
    - on retourne continue, ce qui va faire aller à la suite (incrémentant le paramètre start de 50)
    */
    var routine = function() {
        return page.evaluate(function() {
            var sdocument = document.querySelector('tbody');
            var siframe = document.querySelector('iframe');
            var i = 0;
            while (sdocument == null && siframe == null) {
                var button = document.querySelector('#btnGenerate');
                if (button == null || i == 50) {
                    // console.log('log', 'Return reload');
                    i = 0
                    return "reload";
                } else {
                    // console.log('log', 'Click on button');
                    button.click();
                    sdocument = document.querySelector('tbody');
                    siframe = document.querySelector('iframe');
                    i++;
                }
            }
            if (sdocument) {
                var selector = sdocument.children;
            } else {
                var selector = siframe.contentWindow.document.querySelector('tbody').children;
            }
            if (selector.length == 1) {
                return "finished";
            }
            for (var i = 1; i < 50; i++) {
                // console.log('log', 'Iterate table');
                console.log('save',
                    selector[i].children[0].innerText,
                    parseInt(selector[i].children[1].innerText.split(' ')[1]),
                    selector[i].children[2].innerText.slice(0, -1),
                    selector[i].children[2].innerText.slice(-1),
                );
            }
            // console.log('log', Return continue');
            return "continue";
        });
    }

    /*
    Logique inhérente au navigateur pendant la routine
    - si routine renvoit "reload" : on recharge la page
    - si routine renvoit "continue" : on charge à partir de n+50
    */
    while (hasToWork) {
        var result = await routine();
        if (result == "reload") {
            await page.reload();
        } else if (result == "continue") {
            split = url.split('=');
            url = split[0] + "=" + (parseInt(split[1]) + 50).toString();
            await page.goto(url);
        } else { // "finished"
            hasToWork = false;
        }
    }
    console.log(JSON.stringify(json));
    console.log(Date.now() - time);

    await browser.close();
})();
