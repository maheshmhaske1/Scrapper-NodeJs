const express = require('express');
const router = express.Router();
const Excel = require('excel4node');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { promisify } = require('util');



router.get('/', async (req, res) => {
  const searchTerm = 'swimming coaching and training academies in india';


  const extractItems = async (page) => {
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".Nv2PK")).map((el) => {
        const link = el.querySelector("a.hfpxzc").getAttribute("href");
        const stateCityText = el.querySelector(".W4Efsd:last-child > .W4Efsd:nth-of-type(1) > span:last-child")?.textContent;

        return {
          title: el.querySelector(".qBF1Pd")?.textContent.trim(),
          avg_rating: el.querySelector(".MW4etd")?.textContent.trim(),
          reviews: el.querySelector(".UY7F9")?.textContent.replace("(", "").replace(")", "").trim(),
          address: el.querySelector(".W4Efsd:last-child > .W4Efsd:nth-of-type(1) > span:last-child")?.textContent.replaceAll("·", "").trim(),
          description: el.querySelector(".W4Efsd:last-child > .W4Efsd:nth-of-type(2)")?.textContent.replace("·", "").trim(),
          website: el.querySelector("a.lcr4fd")?.getAttribute("href"),
          category: el.querySelector(".W4Efsd:last-child > .W4Efsd:nth-of-type(1) > span:first-child")?.textContent.replaceAll("·", "").trim(),
          timings: el.querySelector(".W4Efsd:last-child > .W4Efsd:nth-of-type(3) > span:first-child")?.textContent.replaceAll("·", "").trim(),
          phone_num: el.querySelector(".W4Efsd:last-child > .W4Efsd:nth-of-type(3) > span:last-child")?.textContent.replaceAll("·", "").trim(),
          extra_services: el.querySelector(".qty3Ue")?.textContent.replaceAll("·", "").replaceAll("  ", " ").trim(),
          latitude: link.split("!8m2!3d")[1].split("!4d")[0],
          longitude: link.split("!4d")[1].split("!16s")[0],
          link,
          dataId: link.split("1s")[1].split("!8m")[0],
        };
      });
    });
  };

  const getReverseGeocode = async (latitude, longitude) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = response.data;

      if (data && data.address) {
        return {
          house_number: data.address.house_number || '',
          road: data.address.road || '',
          neighbourhood: data.address.neighbourhood || '',
          suburb: data.address.suburb || '',
          county: data.address.county || '',
          state_district: data.address.state_district || '',
          state: data.address.state || '',
          'ISO3166-2-lvl4': data.address['ISO3166-2-lvl4'] || '',
          postcode: data.address.postcode || '',
          country: data.address.country || '',
          country_code: data.address.country_code || '',
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error:', error.message);
      return null;
    }
  };

  const scrollPage = async (page, scrollContainer, maxScrolls) => {
    let items = [];
    let previousHeight = await page.evaluate(`document.querySelector("${scrollContainer}").scrollHeight`);

    for (let scrollCount = 0; scrollCount < maxScrolls; scrollCount++) {
      console.log(`Getting Data from Page - ${scrollCount}`)
      console.log("")
      const newItems = await extractItems(page);
      items = [...items, ...newItems];

      await page.evaluate(`document.querySelector("${scrollContainer}").scrollTo(0, document.querySelector("${scrollContainer}").scrollHeight)`);
      await page.waitForTimeout(3000);
      await page.evaluate(`document.querySelector("${scrollContainer}").scrollHeight > ${previousHeight}`);
      previousHeight = await page.evaluate(`document.querySelector("${scrollContainer}").scrollHeight`);
    }

    return items;
  };


  const getMapsData = async () => {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--disabled-setuid-sandbox", "--no-sandbox"],
    });

    const [page] = await browser.pages();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4882.194 Safari/537.36",
    });

    const searchTerm = 'swimming coaching and training academies in india';
    const encodedSearchTerm = encodeURIComponent(searchTerm);

    await page.goto(`https://www.google.com/maps/search/${encodedSearchTerm}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    let data = await scrollPage(page, ".m6QErb[aria-label]", 10);

    // Add address details to each data item
    for (let i = 0; i < data.length; i++) {

      console.log("================ LOG INFO ================")
      console.log(`total records - (${data.length})`)
      console.log(`completed records- (${i + 1})`)
      console.log("")
      const reverseGeocodeResult = await getReverseGeocode(data[i].latitude, data[i].longitude);
      if (!reverseGeocodeResult)
      data[i]['house_number'] = reverseGeocodeResult && (reverseGeocodeResult.house_number != null && reverseGeocodeResult.house_number !== undefined) ? reverseGeocodeResult.house_number : "";
      data[i]['road'] = reverseGeocodeResult && (reverseGeocodeResult.road != null && reverseGeocodeResult.road !== undefined) ? reverseGeocodeResult.road : "";
      data[i]['neighbourhood'] = reverseGeocodeResult && (reverseGeocodeResult.neighbourhood != null && reverseGeocodeResult.neighbourhood !== undefined) ? reverseGeocodeResult.neighbourhood : "";
      data[i]['suburb'] = reverseGeocodeResult && (reverseGeocodeResult.suburb != null && reverseGeocodeResult.suburb !== undefined) ? reverseGeocodeResult.suburb : "";
      data[i]['county'] = reverseGeocodeResult && (reverseGeocodeResult.county != null && reverseGeocodeResult.county !== undefined) ? reverseGeocodeResult.county : "";
      data[i]['state_district'] = reverseGeocodeResult && (reverseGeocodeResult.state_district != null && reverseGeocodeResult.state_district !== undefined) ? reverseGeocodeResult.state_district : "";
      data[i]['state'] = reverseGeocodeResult && (reverseGeocodeResult.state != null && reverseGeocodeResult.state !== undefined) ? reverseGeocodeResult.state : "";
      data[i]['postcode'] = reverseGeocodeResult && (reverseGeocodeResult.postcode != null && reverseGeocodeResult.postcode !== undefined) ? reverseGeocodeResult.postcode : "";
      data[i]['country'] = reverseGeocodeResult && (reverseGeocodeResult.country != null && reverseGeocodeResult.country !== undefined) ? reverseGeocodeResult.country : "";
      data[i]['country_code'] = reverseGeocodeResult && (reverseGeocodeResult.country_code != null && reverseGeocodeResult.country_code !== undefined) ? reverseGeocodeResult.country_code : "";
      
      if (i + 1 == data.length) {
        CreateExcel(data)
      }
    }

    await browser.close();
  };

  async function CreateExcel(data) {
    console.log("")
    console.log("")
    console.log("================ Creating Excel ================")

    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet('Sheet 1');

    // Add headers
    const headers = Object.keys(data[0]);
    headers.forEach((header, index) => {
      ws.cell(1, index + 1).string(header);
    });

    // Add data
    data.forEach((row, rowIndex) => {
      headers.forEach((header, colIndex) => {
        ws.cell(rowIndex + 2, colIndex + 1).string(String(row[header]));
      });
      console.log(`${rowIndex + 1} records inserted out of (${data.length})`)
    });

    // Promisify the write function
    const writeFileAsync = promisify(wb.write).bind(wb);
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().replace(/:/g, '-').split('.')[0];
      const fileName = `ExcelFile_${searchTerm}_${formattedDate}.xlsx`;


      await writeFileAsync(`${fileName}.xlsx`);
      console.log(`Excel file saved successfully!(${fileName})`);
    } catch (err) {
      console.error(err);
    }

  }


  getMapsData();
});

router.get('/test', async function (req, res, next) {
  const axios = require('axios');

  const getReverseGeocode = async (latitude, longitude) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = response.data;

      if (data && data.display_name) {
        console.log('Formatted Address:', data.display_name);

      } else {
        console.error('No results found');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  // const latitude = 'YOUR_LATITUDE'; // Replace with the actual latitude
  // const longitude = 'YOUR_LONGITUDE'; // Replace with the actual longitude
  const latitude = 12.9696321
  const longitude = 77.5955328

  getReverseGeocode(latitude, longitude);
})

module.exports = router;
