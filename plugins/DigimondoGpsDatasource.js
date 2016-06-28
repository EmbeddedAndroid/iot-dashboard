(function () {

    // Digimondo Frontend: https://frontend.digimondo.io/login

    // https://api.digimondo.io/v1/aaaaaaaabbccddff?auth=3a9fce0d7fd743e56010d770d7432f6f&limitToLast=10
    // &offset=10
    // &payloadonly
    // TODO: Make a boolean flag to only receive new values based on "receivedAfter" set to last received value

    var TYPE_INFO = {
        type: "digimondo-gps-datasource",
        name: "Digimondo Gps",
        description: "Featch GPS Locations from the Digimondo API",
        // dependencies: ["/path/to/some.js"]
        settings: [
            {
                id: "auth",
                name: "Auth Token",
                description: "Digimondo Authentication Token",
                defaultValue: "3a9fce0d7fd743e56010d770d7432f6f",
                type: "string"
            },
            {
                id: "appEui",
                name: "Application EUI",
                description: "Digimondo Application EUI",
                defaultValue: "aaaaaaaabbccddff",
                type: "string"
            },
            {
                id: "limitToLast",
                name: "Limit",
                description: "The amount of most recent Packets to be returned",
                defaultValue: 0,
                type: "number"
            },
            {
                id: "offset",
                name: "Offset",
                description: "The amount of most recent Packets to skip",
                defaultValue: 0,
                type: "number"
            },
            {
                id: "receivedAfter",
                name: "Received After",
                description: "Only return packets after this date",
                defaultValue: 0,
                type: "number"
            }
            /*,
            {
                id: "maxValues",
                name: "Max Values",
                description: "Maximum number of values stored",
                type: "number"
            }  */
        ]
    };

    function safeParseJsonObject(string) {
        try {
            return JSON.parse(string);
        }
        catch (e) {
            console.error("Was not able to parse JSON: " + string);
            return {}
        }
    }

    function base64ToHex(str) {
        for (var i = 0, bin = atob(str.replace(/[ \r\n]+$/, "")), hex = []; i < bin.length; ++i) {
            var tmp = bin.charCodeAt(i).toString(16);
            if (tmp.length === 1) tmp = "0" + tmp;
            hex[hex.length] = tmp;
        }
        return hex;
    }

    function payloadToGps(payload) {
        var hexValue = base64ToHex(payload);

        // ADUcDjcJNybM
        // 8  bits int seqNum
        var seqNum = parseInt("0x" + hexValue[0]);
        // 8  bits int lat_deg
        var lat_deg = parseInt("0x" + hexValue[1]);
        // 8  bits int lat_min
        var lat_min = parseInt("0x" + hexValue[2]);
        // 16 bits int lat_10000min
        var lat_10000min = parseInt("0x" + hexValue[3] + hexValue[4]);
        // 8  bits int long_deg
        var long_deg = parseInt("0x" + hexValue[5]);
        // 8  bits int long_min
        var long_min = parseInt("0x" + hexValue[6]);
        // 16 bits int long_10000min
        var long_10000min = parseInt("0x" + hexValue[7] + hexValue[8]);

        return {
            "lat": lat_deg + lat_min / 60 + (lat_10000min / 10000) / 60,
            "lon": long_deg + long_min / 60 + (long_10000min / 10000) / 60
        };
    }

    function fetchData() {
        this.history = [];
        var history = this.history;
        var auth = this.props.auth;



        fetch("https://api.digimondo.io/v1/aaaaaaaabbccddff" +
            "?auth=" + auth +
            (this.props.limitToLast ? "&limitToLast=" + this.props.limitToLast : "" ) +
            (this.props.offset ? "&offset=" + this.props.offset : "" ) +
            (this.props.receivedAfter ? "&receivedAfter=" + this.props.receivedAfter : "" ) +
            "&payloadonly")
            .then(function (response) {
                return response.json();
            }).then(function (data) {

            _.forEach(data, function (value) {

                value.gps = payloadToGps(value.payload);
                console.log("value:", value);
                history.push(value);
            })

        });

        /*
        const maxValues = Number(this.props.maxValues) || 1000;
        while (history.length > maxValues) {
            this.history.shift();
        }      */
    }

    function Datasource(props, history) {

        this.props = props;

        this.interval = setInterval(fetchData.bind(this), 2000);
        this.history = history || [];


        this.updateProps = function (props) {
            this.props = props;
            fetchData();
            console.log("update props")
        };

        this.getValues = function () {
            return this.history;
        };

        this.dispose = function () {
            this.history = [];
            clearInterval(this.interval);
        }
    }

    window.iotDashboardApi.registerDatasourcePlugin(TYPE_INFO, Datasource);

})();