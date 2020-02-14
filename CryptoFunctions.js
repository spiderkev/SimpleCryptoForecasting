// Global variables
var num_days_to_consider = 30;
var num_days_to_forcast = 7;
var portfolio_div,tbl;

function updatePortfolio() {
    portfolio_div.removeChild(tbl);
    initialise();
}

function initialise() {
    var investment_string = document.getElementById('investments').value;
    var investments = parseInputString(investment_string);
    user_portfolio = createPortfolio(investments);
    drawTable(user_portfolio);
}

function parseInputString(inputString) {
    inputString = inputString.replace(/[\[\]']+/g,'');
    str_array = inputString.split(',');
    // extract 3 investment values
    var investmentList = []
    for (var i = 0; i < str_array.length; i = i+3) {
        investmentList.push([str_array[i], str_array[i+1], str_array[i+2]])
    }
    return investmentList;
}

function drawTable(portfolio) {
    tbl = document.createElement('table');    // create table element
    portfolio_div = document.getElementById('portfolio');
    // Create header row
    var row = document.createElement('tr');
    var cell = document.createElement('th');
    var cellText = document.createTextNode('Crypto Currency')
    cell.appendChild(cellText);
    row.appendChild(cell);

    cell = document.createElement('th');
    cellText = document.createTextNode('Current Price')
    cell.appendChild(cellText);
    row.appendChild(cell);

    cell = document.createElement('th');
    cellText = document.createTextNode('Quantity Owned')
    cell.appendChild(cellText);
    row.appendChild(cell);

    cell = document.createElement('th');
    cellText = document.createTextNode('Total Investment')
    cell.appendChild(cellText);
    row.appendChild(cell);

    tbl.append(row);

    for (var r = 0; r < portfolio.length; r=r+2) {
        row = document.createElement("tr");
        var cryptoCurr = portfolio[r];
  
        // Add name of crypto
        cell = document.createElement('td');
        cellText = document.createTextNode(cryptoCurr.CryptoName + ' (' + cryptoCurr.cryptoSymbol + ')');
        cell.appendChild(cellText); 
        row.appendChild(cell);

        // Add current price
        cell = document.createElement('td');
        cellText = document.createTextNode(cryptoCurr.currentPrice + ' (' + cryptoCurr.currency + ')');
        cell.appendChild(cellText);
        row.appendChild(cell);

        // Add quantity
        cell = document.createElement('td');
        cellText = document.createTextNode(portfolio[r+1]);
        cell.appendChild(cellText);
        row.appendChild(cell);

        // Price x Quantity
        cell = document.createElement('td');
        var total_amt = (parseFloat(cryptoCurr.currentPrice) * parseFloat(portfolio[r+1])).toString() + ' (' + cryptoCurr.currency + ')'
        cellText = document.createTextNode(total_amt);
        cell.appendChild(cellText);
        row.appendChild(cell);

        // Add row to table
        tbl.append(row);
    }
    portfolio_div.appendChild(tbl);
}

// Create a portfolio of investments
function createPortfolio(investments) {
    var portfolio = []
    for (var i = 0; i < investments.length; i++) {
        var crypto_symbol = investments[i][0];
        var currency = investments[i][1];
        var quantity = investments[i][2];
        var cryptoCurr = new CryptoCurrency(crypto_symbol, currency);
        portfolio.push(cryptoCurr, quantity);
    }
    return portfolio;
}

function updateForecast() {
    var crypto_symbol = document.getElementById("crypto_symbol").value;
    var currency = document.getElementById("currency").value;
    num_days_to_consider = document.getElementById("num_days_for_SMA").value;
    num_days_to_forcast = document.getElementById("num_days_to_forecast").value;

    var cryptoCurr = new CryptoCurrency(crypto_symbol, currency);
    plotGraph(cryptoCurr, "forecast-chart");
}

function plotGraph(CryptoCurr, chartID) {
    var forecastList = CryptoCurr.forecast;
    var ctx = document.getElementById(chartID).getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getDateList(forecastList.length),
            datasets: [{
                label: CryptoCurr.CryptoName,
                data: forecastList,
                borderColor: '#2E8B57',
                fill: false
            }]
        }
    }
    );
}

// Get the dates for the next n days
function getDateList(numDays) {
    var current_date = new Date();
    current_date = current_date.getDate();
    var dates = []
    for (var i = 0; i < numDays; i++) {
        var next_day = new Date();
        next_day.setDate(current_date + 1)
        var next_day = next_day.getDate();
        dates.push(next_day);
        current_date = next_day;
    }
    return dates;
}

class CryptoCurrency {
    constructor (cryptoSymbol, currency) {
        this.cryptoSymbol = cryptoSymbol;
        this.CryptoName = ''; // This will get populated when historic data is retrieved
        this.historicData = this.getHistoricData(cryptoSymbol, currency);
        this.currentPrice = this.getCurrentPrice();
        this.forecast = this.getForecast(num_days_to_consider, num_days_to_forcast);
        this.currency = currency;
    }

    getCurrentPrice() {
        var round_num = Math.round(this.historicData[0][1]*100)/100;
        return round_num;

    }

    getHistoricData(crypto_symbol, currency) {
        const alphaAdvantage_apikey = 'IROMENHL95JMQODX';
        var url = 'https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=' + crypto_symbol + '&market=' + currency + '&apikey=' + alphaAdvantage_apikey;
        //var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
        var xhReq = new XMLHttpRequest();
        xhReq.open("GET", url, false);
        xhReq.send(null);
        
        //Parse the returned JSON object to get a [date, price] tuple array
        var jsonObject = JSON.parse(xhReq.responseText);
        this.CryptoName = jsonObject['Meta Data']['3. Digital Currency Name']; // Populate crypto name
        var ts = jsonObject['Time Series (Digital Currency Daily)'];
        var historic_data = []
        for (var ts_day of Object.keys(ts)) {
            var ts_day_closeVal = ts[ts_day];
            var entry = [ts_day, ts_day_closeVal["4b. close (USD)"]]
            historic_data.push(entry);
        }
    
        return historic_data;
    }

    // Get forecast using Slow Moving Averages
    getForecast(num_days_to_consider, num_days_to_forcast) {
        var forecast = []
        for (var days_forcasted = 0; days_forcasted < num_days_to_forcast; days_forcasted++) {
            var sum = 0
            // Get enteries from forecast
            for (var i=0; i < days_forcasted; i++)
                sum = sum + parseFloat(forecast[i]);

            // Get entries from historic data
            for (var prev_days = 0; prev_days < num_days_to_consider - days_forcasted; prev_days++)
                sum = sum + parseFloat(this.historicData[prev_days][1]);
            
            var avg = sum / num_days_to_consider;
            forecast.push(avg);
        }
        return forecast;
    }
}

class User {
    constructor(name,investments) {
        this.name = name;
        this.portfolio = this.createPortfolio(investments);
        //this.lineColors = ['#FF0000','#0000FF','#00FF00','#00B2EE', '#FFC125','#836FFF','#2E8B57','#FF69B4','#1E1E1E','#EEC900'];
        
        
    }

    readPortfolio() {
        for (var i = 0; i < this.portfolio.length; i++)
            console.log(this.portfolio[i]);
    }

    // Create a portfolio of
    createPortfolio(investments) {
        var portfolio = []
        for (var i = 0; i < investments.length; i++) {
            var crypto_symbol = investments[i][0];
            var currency = investments[i][1];
            var quantity = investments[i][2];
            var cryptoCurr = new CryptoCurrency(crypto_symbol, currency);
            portfolio.push(cryptoCurr, quantity);
        }
        return portfolio;
    }
}
