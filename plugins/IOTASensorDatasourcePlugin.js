(function () {

    var TYPE_INFO = {
        type: "iota-sensor-datasource",
        name: "IOTA Sensor Datasource",
        description: "Fetches sensor data from the IOTA tangle",
        settings: [
            {
                id: "address",
                name: "IOTA Address",
                description: "IOTA address to read data from",
                defaultValue: "",
                required: true,
                type: "string"
            },
            {
                id: "host",
                name: "IOTA Host Server",
                description: "IOTA Light Node Host",
                defaultValue: "",
                type: "string"
            },
            {
                id: "port",
                name: "IOTA Host Server Port",
                description: "IOTA Light Node Port",
                defaultValue: 0,
                type: "number"
            }
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

    function payloadToTrytes(payload, settings) {

        var trytes = [];

        payload.forEach(function (hash) {

            var command = {
                'command': 'getTrytes',
                'hashes': [hash]
            }

            console.log('tryes-cmd', command);

            var options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-IOTA-API-Version': '1'
                },
                body: JSON.stringify(command)
            };

            fetch(settings.host + ':' + settings.port, options)
                .then(function (response) {
                    return response.json();
                }).then(function (data) {

                _.forEach(data, function (value) {
                    console.log('trytes:', value)
                    trytes.push(value);
                })
            });
        })
        return trytes;
    }

    function fetchData() {

        var history = [];
        var settings = this.props.state.settings;

        var command = {
            'command': 'findTransactions',
            'addresses': [settings.address.slice(0, -9)]
        }

        var options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
		'X-IOTA-API-Version': '1'
            },
            body: JSON.stringify(command)
        };

        fetch(settings.host + ':' + settings.port, options)
            .then(function (response) {
                return response.json();
            }).then(function (data) {

            _.forEach(data, function (value) {
                console.log('hashes:', value)
                value.date = payloadToTrytes(value, settings);
                self.history = history;
            })

        });
    }

    function Datasource(props) {
        var history = props.state.data;
        this.props = props;

        this.interval = setInterval(fetchData.bind(this), 20000);
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
