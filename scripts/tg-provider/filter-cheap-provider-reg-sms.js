import { loadFile } from "../../utils/loader.js";

const MAX_PRICE = 30;

const main = async () => {
    const fileData = loadFile("config/tg-provider.private.json");
    const data = JSON.parse(fileData.toString())
    const { countries } = data
    const validContries = Object.keys(countries).filter((countryName) => {
        const countryProviders = countries[countryName];
        return countryProviders.filter(({ average }) => average.average_today != 0 || average.average_week != 0 || average.average_month != 0 || average.average != 0).filter(({ price }) => parseFloat(price) <= MAX_PRICE).length > 0
    })
    validContries.map((countryName) => {
        const { min, max } = countries[countryName].filter(({ average }) => average.average_today != 0 || average.average_week != 0 || average.average_month != 0 || average.average != 0).filter(({ price }) => parseFloat(price) <= MAX_PRICE).reduce((stat, provider) => {
            const price = parseFloat(provider.price)
            if (stat.min > price) stat.min = price
            if (stat.max < price) stat.max = price
            return stat
        }, { min: 1000000, max: 0 })
        return {
            countryName,
            min,
            max,
        }
    }).sort((a, b) => a.min - b.min).forEach(({ countryName, min, max }) => console.log(`${countryName} min=${min} max=${max}`))
}

main()