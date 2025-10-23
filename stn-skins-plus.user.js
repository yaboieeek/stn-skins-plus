// ==UserScript==
// @name         STN skins++
// @namespace    eeek
// @version      2.1.0
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

class ApiService {
    static async getItemSkuFromAutobot(itemName) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: `https://schema.autobot.tf/getItemObject/fromName/${encodeURIComponent(itemName)}`,
                responseType: 'json',
                timeout: 5 * 1000,
                onload: (res) => {
                    if (res.status === 200) {
                        console.log('SKU data:', res.response.item);
                        resolve(res.response.item);
                    } else {
                        console.error('Failed to get SKU:', res.status);
                        resolve(null);
                    }
                },
                onerror: (err) => {
                    console.error('Error getting SKU:', err);
                    resolve(null);
                },
                ontimeout: () => {
                    console.log('Autobot endpoint is slow. Try again later!');
                    resolve(null);
                }
            })
        })
    }

    static async getItemNameFromSKU(itemSKU) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: `https://schema.autobot.tf/getName/fromSku/${encodeURIComponent(itemSKU)}?proper=true&usePipeForSkin=true`,
                responseType: 'json',
                timeout: 5 * 1000,
                onload: (res) => {
                    if (res.status === 200) {
                        console.log('Name data:', res.response);
                        resolve(res.response);
                    } else {
                        console.error('Failed to get name:', res.status);
                        resolve(null);
                    }
                },
                onerror: (err) => {
                    console.error('Error getting name:', err);
                    resolve(null);
                },
                ontimeout: () => {
                    console.log('Autobot endpoint is slow. Try again later!');
                    resolve(null);
                }
            })
        })
    }
}

class DataManager {
    constructor() {
        this.skuData = null;
        this.itemNameFromSku = null;
        this.processed = false;
    }

    async initialize() {
        if (this.processed) return;

        this.skuData = await ApiService.getItemSkuFromAutobot(itemData.itemName);
        if (!this.skuData) return false;

        const skuVals = Object.entries(this.skuData).map(e => e[1]);
        this.mpSKU = `${skuVals[0]};${skuVals[1]};w${skuVals[3]};pk${skuVals[4]}`;

        this.itemNameFromSku = await ApiService.getItemNameFromSKU(this.mpSKU);

        this.processed = true;
        return true;
    }

    getMarketplaceSKU() {
        return this.mpSKU;
    }

    getItemNameForBackpack() {
        return this.itemNameFromSku?.name || null;
    }
}

class LinkGenerator {
    static async createLinks(dataManager) {
        if (!dataManager.processed) {
            const success = await dataManager.initialize();
            if (!success) return null;
        }

        const marketplaceLink = `https://marketplace.tf/items/tf2/${dataManager.getMarketplaceSKU()}`;

        const bpItemName = dataManager.getItemNameForBackpack();
        if (!bpItemName) return { marketplace: marketplaceLink, backpack: null };

        const isStrange = itemData.itemName.includes('Strange');
        const qualityType = isStrange ? 'Strange' : 'Decorated Weapon';
        const encodedName = encodeURIComponent(bpItemName.replace('Strange ', ''));
        const backpackLink = `https://backpack.tf/stats/${qualityType}/${encodedName}/Tradable/Craftable`;

        return {
            marketplace: marketplaceLink,
            backpack: backpackLink
        };
    }
}

class UIController {
    init() {
        this.target = document.querySelector('.px-3.px-sm-0');
        if (!this.target) {
            console.error('Target element not found');
            return;
        }

       this.remakeWishlist();

        this.createButtonsAsync();
    }

    async createButtonsAsync() {
        const dataManager = new DataManager();

        const marketplaceButton = this.createButton('Marketplace.tf', 'mp-tf-btn');
        const backpackButton = this.createButton('Backpack.tf', 'bp-tf-btn');
        const steamButton = this.createButton('Steam', 'scm-btn');

        steamButton.href = `https://steamcommunity.com/market/listings/440/${encodeURIComponent(itemData.itemName)}`;

        this.target.appendChild(marketplaceButton);
        this.target.appendChild(backpackButton);
        this.target.appendChild(steamButton);

        const links = await LinkGenerator.createLinks(dataManager);

        if (links) {
            if (links.marketplace) {
                marketplaceButton.href = links.marketplace;
                marketplaceButton.classList.remove('loading');
                marketplaceButton.style.pointerEvents = 'auto';
            } else {
                marketplaceButton.remove();
            }

            if (links.backpack) {
                backpackButton.href = links.backpack;
                backpackButton.classList.remove('loading');
                backpackButton.style.pointerEvents = 'auto';
            } else {
                backpackButton.remove();
            }
        } else {
            marketplaceButton.remove();
            backpackButton.remove();
        }
    }

    createButton(siteName, cssClass) {
        const button = document.createElement('a');
        button.className = `btn addon-btn ${cssClass} ${(siteName !== 'Steam') ? 'loading' : ''}`;
        button.target = `_blank`;
        button.style.cursor = 'pointer';
        button.style.pointerEvents = siteName !== 'Steam' ? 'none' : 'auto' ;

        const viewonContainer = document.createElement('div');
        const [viewOn, siteNameEl] = [document.createElement('div'), document.createElement('div')];

        viewonContainer.append(viewOn, siteNameEl);
        viewOn.innerText = 'View on';
        viewOn.className = 'view-on';
        siteNameEl.className = 'site-name';
        siteNameEl.innerText = siteName;

        button.append(viewonContainer);
        return button;
    }

    remakeWishlist() {
        const fwBtn = this.target.querySelector('#wishlist_add');
        const unfwBtn = this.target.querySelector('#wishlist_remove');

        const fwIcon = fwBtn.querySelector('i');
        const unfwIcon = unfwBtn.querySelector('i');

        fwBtn.textContent = '';
        unfwBtn.textContent = '';

        fwBtn.append(fwIcon);
        unfwBtn.append(unfwIcon);
    }
}

class App {
    async init() {
        if (typeof defCat === 'undefined' || defCat !== 'skins') {
            console.log('Not a skin item or defCat not available');
            return;
        }

        if (typeof itemData === 'undefined' || !itemData.itemName) {
            console.log('itemData not available');
            return;
        }

        console.log('Initializing for item:', itemData.itemName);
        new UIController().init();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App().init());
} else {
    new App().init();
}

GM_addStyle(`
    .addon-btn {
        border-left: 1px solid #777;
        border-right: 1px solid #777;
        border-radius: 0;
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
        text-decoration: none;
    }

    .addon-btn:hover {
        background-color: #666;
        border-color: white;
        text-decoration: none;
    }

    .loading {
        animation: loading 3s ease-in-out infinite;
        background: linear-gradient(90deg, #373737, #666, #373737);
        filter: brightness(.8);
        background-size: 200% 100%;
    }

    @keyframes loading {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: 0% 0;
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
`);
