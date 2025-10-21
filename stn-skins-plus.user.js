// ==UserScript==
// @name         STN skins+
// @namespace    eeek
// @version      1.0.0
// @description  marketplace buttons for skins :p
// @author       eeek
// @match        https://stntrading.eu/item/tf2/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=stntrading.eu
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

const skinsCollections = [
    `Gentlemanne's`,
    `Teufort`,
    `Craftsmann`,
    `Concealed Killer`,
    `Powerhouse`,
]

// Thanks idinium for itemSchema
class Schema {
    constructor() {
        this.schema = GM_getValue('itemSchema', []);
    }

    async updateSchema() {
        if (this.schema.length === 0) {
            const schema = await ApiService.fetchSchema();
            this.schema = schema;
            GM_setValue('itemSchema', schema);
        } else {
            console.log(`Schema [${this.schema.time} | v${this.schema.version}] is ready`);
        }
        return;
    }
}

class ApiService {
    static async fetchSchema() {
        console.log('Trying to fetch schema...');
        const schemaURL = `https://schema.autobot.tf/schema`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: schemaURL,
                timeout: 30 * 1000,
                responseType: 'json',
                onload: (res) => {
                    try {
                        console.log(`Got response!`);
                        const result = res.response;
                        console.log(`Schema [${result.time} | v${result.version}] fetched successfully. Happy trading!`);
                        createAlert(`Schema [${result.time} | v${result.version}] fetched successfully!`, `Happy trading!`, '#7d7')
                        resolve(result);
                    } catch (err) {
                        console.error(`Error fetching schema! ${res}\n${err}`);
                    }
                },
                ontimeout: () => createAlert('Timed out!', 'We couldn\'t fetch the schema in 30 seconds. Try again later!')
            })
        })
    }
}

class ItemGenerator {
    constructor(schema, fullSkinName) {
        this.schema = schema.schema;
        this.fullName = fullSkinName;
    }

    get warpaints() {
        if (this.schema.length === 0) {
            console.error(`Schema does not exist. Fetch schema`);
        };
        return this.schema.raw.schema.paintkits;
    }


    getWarpaint() {
        for(const [key, value] of Object.entries(this.warpaints)) {
            if (this.fullName.includes(value)) {
                return [key, value];
            }
        }
    }

    getWear() {
        const wears = {
            1: '(Factory New)',
            2: '(Minimal Wear)',
            3: '(Field-Tested)',
            4: '(Well-Worn)',
            5: '(Battle Scarred)'
        }

        for (const [key, value] of Object.entries(wears)) {
            if(this.fullName.includes(value)) return [key, value];
        }

    }

    getName() {
        if (this.isWarpaint) return [...this.getWarpaint()];

        const iE1 = Object.entries(this.schema.raw.schema.items).filter(([,{item_name}]) => this.fullName.includes(item_name));
        const itemEntries = iE1.map(entry => entry[1]);

        const final = itemEntries.some(({name}) => name.includes('Upgradeable')) ?
              itemEntries.find((item) => item.name.includes('Upgradeable') && item.defindex != 190 /* this fucking bat istg */)
        : itemEntries[0];
        return [final.defindex, final.name]

    }
    getQuality() {
        return this.fullName.includes('Strange') ? 11 : 15; //Either decorated or strange
    }

    get isWarpaint() {
        return this.fullName.includes('War Paint');
    }

    get isSpecificSkin() {
        return
    }

    getWarpaintIndex(kitNumber) {
        return Object.entries(this.schema.raw.schema.items).find(([, {name}]) => name.includes(`Paintkit ${kitNumber}`))[1].defindex
    }
    getSKU(){
        try {
            const name = this.getName()[0];
            const quality = this.getQuality();
            const paintKit = this.isWarpaint ? name: this.getWarpaint()[0];
            const wear = this.getWear()[0];

            if (this.isWarpaint) {
                return `${this.getWarpaintIndex(paintKit)};${quality};w${wear};pk${paintKit}`
            }
            return `${name};${quality};w${wear};pk${paintKit}`
        } catch (e) {
            console.error(e);
            return createAlert('Can\'t get skin info!', 'There was an error creating sku. More info in console', '#A66')
        }
    }
}

class LinkGenerator {
    constructor(itemGenerator) {
        this.itemGenerator = itemGenerator;
    }

    generateSteamLink() {

    }

    generateMarketplaceLink() {
        const SKU = this.itemGenerator.getSKU();
        if (typeof SKU === 'undefined') return SKU;
        return `https://marketplace.tf/items/tf2/${SKU}`
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
            if (moreItemsElements.some(title => skinsCollections.some(collection => title.includes(collection)))) {
                mptfButton.classList.add('unsure');
                mptfButton.title = `Possible collection item - link may not match`;
            }
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

        const schema = new Schema();
        await schema.updateSchema();

        const fullItemName = itemData.itemName;

        const itemGenerator = new ItemGenerator(schema, fullItemName);

        const linkGenerator = new LinkGenerator(itemGenerator);

        new UIController().init([linkGenerator.generateMarketplaceLink(), `https://steamcommunity.com/market/listings/440/` + fullItemName])
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

    .unsure {
        filter: brightness(0.8)
    }
    `)

