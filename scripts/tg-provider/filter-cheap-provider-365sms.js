import axios from "axios"
import { newSemaphore } from "../../utils/semaphore.js";

const client = axios.create();
const { exec } = newSemaphore(30);
const MAX_PRICE = 30;

const main = async () => {
    const countries = await getCountries();
    (await Promise.all(countries.map(async (country) => {
        let retry = 0;
        while (retry < 3) {
            try {
                const tgService = await exec(() => getTgService(country.id))
                return {
                    country,
                    tgService,
                }
            } catch (e) {
                retry++
                console.error(e?.message)
            }
        }
        return null
    }))).
        filter(val => val).
        filter(({ tgService }) => tgService).
        filter(({ tgService }) => tgService.price <= MAX_PRICE).
        sort((a, b) => {
            if (a.tgService.price != b.tgService.price) {
                return a.tgService.price - b.tgService.price
            } else {
                return b.tgService.numbers_count - a.tgService.numbers_count
            }
        }).
        forEach(({ country, tgService }) => console.log(`${country.en_name} price=${tgService.price} total=${tgService.numbers_count}`))

}

const getCountries = async () => {
    const response = await client.get("https://365sms.ru/api/countries?lang=en&type=activation", {
        headers: {
            "accept-language": "en-US,en;q=0.9"
        }
    })
    return response.data.countries || [];
}

const getServices = async (countryCode) => {
    const response = await client.get(`https://365sms.ru/api/services/${countryCode}/en`, {
        headers: {
            "accept-language": "en-US,en;q=0.9"
        }
    })
    return response.data.services || [];
}

const getTgService = async (countryCode) => {
    const services = await getServices(countryCode)
    return Object.keys(services).map(key => services[key]).find(({ names }) => names.ru == "Telegram")
}

main()