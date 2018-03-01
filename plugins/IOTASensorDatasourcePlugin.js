(function () {

    const TRYTE_CHARS = '9ABCDEFGHIJKLMNOPQRSTUVWXYZ';         // All legal tryte3 characters
    const POWEROF3 = [1, 3, 9, 27, 3 * 27, 9 * 27, 27 * 27];   // Pre calculated 3^i


    const encodingMap_Buffer = {
        'utf8': 'utf8',
        'utf16': 'utf16le',
        'ansi': 'latin1',
    };

    const TRYTE_BOM = {
        'YZ': 'utf16le',
        'ZY': 'utf16be',
        'YY': 'utf8',
    }

    var TYPE_INFO = {
        type: "iota-sensor-datasource",
        name: "IOTA Sensors",
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
                defaultValue: "https://nodes.thetangle.org",
                type: "string"
            },
            {
                id: "port",
                name: "IOTA Host Server Port",
                description: "IOTA Light Node Port",
                defaultValue: 443,
                type: "number"
            }
        ]
    };

    function decodeTextFromBytes(bytes, encoding) {
        // IF NodeJS:
        //let text = Buffer.from(bytes).toString(encoding);
        // IF browser
        let tmp = new Uint8Array(bytes);
        var decoder = new TextDecoder(encoding);
        let text = decoder.decode(tmp);

        return text;
    }

    function decodeBytesFromTryteString(inputTrytes) {
        // If input is not a string, return null
        if (typeof inputTrytes !== 'string') return null

        // If input length is odd, return null
        if (inputTrytes.length % 2) return null

        let bytes = [];

        for (var i = 0; i < inputTrytes.length; i += 2) {
            // get a trytes pair
            var trytes = inputTrytes[i] + inputTrytes[i + 1];

            var firstValue = TRYTE_CHARS.indexOf(trytes[0]);
            var secondValue = TRYTE_CHARS.indexOf(trytes[1]);

            var value = firstValue + secondValue * 27;
            bytes.push(value);
        }

        return bytes;
    }

    function decodeTextFromTryteString(tryte3Str, encoding) {
        // Check if BOM exists
        let bom = tryte3Str.toString().substr(0, 2);
        if (bom in TRYTE_BOM) {
            // Remove bom from tryte string
            tryte3Str = tryte3Str.toString().substr(2);

            // FIXME: What should take precedence? Given encoding argument, or given BOM in data?
            if (typeof encoding === 'undefined') {
                encoding = TRYTE_BOM[bom];
            }
        }
        if (typeof encoding === 'undefined') {
            // If no BOM is found, decode as it it was a one byte characterset
            encoding = 'latin1';
        }

        let bytes = decodeBytesFromTryteString(tryte3Str);
        let text = decodeTextFromBytes(bytes, encoding);
        return text;
    }

    function payloadToTrytes(payload, settings) {

        var messages = [];

        _.forEach(payload, function (hash) {

            var command = {
                'command': 'getTrytes',
                'hashes': [hash]
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

                _.forEach(data, function (value, i) {
                    var message = decodeTextFromTryteString(value);
                    var tmp = { 'id': i, 'message': message}
                    messages.push(tmp);
                })
            });
        })
        return messages;
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
                var messages = payloadToTrytes(value, settings);
                history.push(messages);
                console.log(history);
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
