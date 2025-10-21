// ==UserScript==
// @name         STN skins+
// @namespace    eeek
// @version      2.0.0
// @description  marketplace buttons for skins :p
// @author       eeek
// @match        https://stntrading.eu/item/tf2/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=stntrading.eu
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==
const wears = {
    1: '(Factory New)',
    2: '(Minimal Wear)',
    3: '(Field-Tested)',
    4: '(Well-Worn)',
    5: '(Battle Scarred)'
}

// Thanks idinium for itemSchema
class ApiService {
    static getItemSkuFromAutobot(itemName) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: `https://schema.autobot.tf/getItemObject/fromName/${itemName}`,
                responseType: 'json',
                timeout: 5 * 1000,
                onload: (res) => {
                    if (res.success) return console.log(res);
                    resolve(res.response.item);
                },
                ontimeout: () => console.log('Autobot endpoint is slow. Try again later!')
            })
        })
    }
}


class LinkGenerator {
    static async createMarketplaceLink() {
        const itemSKU = await ApiService.getItemSkuFromAutobot(itemData.itemName);
        const skuVals = Object.entries(itemSKU).map(e => e[1]);
        const mpSKU = `${skuVals[0]};${skuVals[1]};w${skuVals[3]};pk${skuVals[4]}`;
        return `https://marketplace.tf/items/tf2/${mpSKU}`
    }
}
class UIController {
    init(links) {
        this.target = document.querySelector('.px-3.px-sm-0');
        for (const link of links) {
            if (typeof link === 'undefined') return;
            const button = this.makeButton(link);
            this.target.append(button)
            button.style.height = document.querySelector(`#wishlist_add`).offsetHeight + 'px';
        }
    }

    makeButton(link) {
        const moreItemsElements = [...document.querySelectorAll('.d-flex.justify-content-between.align-items-end')].map(e => e.textContent);
        const mptfButton = document.createElement('a');
        mptfButton.className = 'btn addon-btn';
        mptfButton.href = link;
        mptfButton.target = `_blank`;
        const viewonContainer = document.createElement('div');
        const [viewOn, siteName] = [document.createElement('div'), document.createElement('div')];

        viewonContainer.append(viewOn, siteName);

        viewOn.innerText = 'View on';
        if (link.includes('marketplace')) {
            siteName.innerText = 'Marketplace.tf';
            mptfButton.classList.add('mp-tf-btn');
        } else {
            siteName.innerText = 'Steam'
            mptfButton.classList.add('scm-btn');
        }
        viewOn.className = 'view-on';
        siteName.className = 'site-name';

        mptfButton.append(viewonContainer);

        return mptfButton
    }
}

class App {
    async init() {
        if (defCat !== 'skins') return;


        const fullItemName = itemData.itemName;
        const links = [await LinkGenerator.createMarketplaceLink(), `https://steamcommunity.com/market/listings/440/` + fullItemName]
        new UIController().init(links)
    }
}

new App().init()

GM_addStyle(`

    .addon-btn {
        text-align: start;
      background-color: #373737;
      border-color: #494949;
      border-style: solid;
      border-width: 1px;
      display: -webkit-inline-box;
      display: -ms-inline-flexbox;
      display: inline-flex;
      padding: 6px 9px;
      border: 2px solid #777;
      border-left: none;
      &:hover{
          background-color: #666;
          border-color: white
      }
    }
    .mp-tf-btn {
      border-left: 1px solid #777;
      border-right: 1px solid #777;
      border-radius: 0;
      &:hover{
          background-color: #666;
          border-color: white
      }
    }

    .scm-btn {
        border-left: 1px solid #777;
      border-radius: 0 10px 10px 0;
    }

    .view-on-container {
      margin-top: 4px;
      padding-left: 8px;
    }
    .view-on {
      color: #93d2ff;
      font-size: 12px;
      line-height: 1em;
    }
    .site-name {
      color: #eaeaea;
      font-size: 20px;
      line-height: 1em;
    }

    `)

