import * as Action from '../actionNames'
import {genCrudReducer} from '../util/reducer'
import * as Uuid from '../util/uuid'
import DatasourcePlugins from '../datasource/datasourcePlugins'
import WidgetPlugins from '../widgets/widgetPlugins'
import $script from 'scriptjs';
import * as PluginApi from './pluginApi'
import _  from 'lodash'
import sandie from 'sandie'

// TODO: Later load all plugins from external URL's ?
const initialState = {};

export function loadPlugin(plugin) {
    return addPlugin(plugin);
}

export function loadPluginFromUrl(url) {
    return function (dispatch) {
        $script([url], () => {
            if (PluginApi.hasPlugin()) {
                const plugin = PluginApi.popLoadedPlugin();

                const dependencies = plugin.TYPE_INFO.dependencies;
                if (_.isArray(dependencies)) {
                    console.log("Loading Dependencies for Plugin", dependencies);

                    /*sandie([dependencies],
                        function (deps) {
                            plugin.deps = deps;
                            console.log("deps loaded", deps);
                            dispatch(addPlugin(plugin, url));
                        }
                    );  */

                    $script(dependencies, () => {
                     dispatch(addPlugin(plugin, url));
                     });
                }
                else {
                    dispatch(addPlugin(plugin, url));
                }
            }
            else {
                console.error("Failed to load Plugin. Make sure it called window.iotDashboardApi.register***Plugin from url " + url);
            }
        });
    };
}

export function initializeExternalPlugins(plugins = []) {
    return (dispatch, getState) => {
        const state = getState();
        const plugins = _.valuesIn(state.plugins);

        plugins.filter(pluginState => !_.isEmpty(pluginState.url)).forEach(plugin => {
            dispatch(loadPluginFromUrl(plugin.url));
        })
    }
}

function registerPlugin(plugin) {
    const type = plugin.TYPE_INFO.type;
    if (plugin.Datasource) {
        const dsPlugin = DatasourcePlugins.getPlugin(type);
        if (!dsPlugin) {
            DatasourcePlugins.register(plugin);
        }
        else {
            console.warn("Plugin of type " + type + " already loaded:", dsPlugin, ". Tried to load: ", plugin);
        }
    }
    else if (plugin.Widget) {
        const widgetPlugin = WidgetPlugins.getPlugin(type);
        if (!widgetPlugin) {
            WidgetPlugins.register(plugin);
        }
        else {
            console.warn("Plugin of type " + type + " already loaded:", widgetPlugin, ". Tried to load: ", plugin);
        }
    }
    else {
        throw new Error("Plugin neither defines a Datasource nor a Widget.", plugin);
    }
}

// Add plugin to store and register it in the PluginRegistry
// TODO: Plugins have to know if they are a Datasource or Widget Plugin
export function addPlugin(plugin, url = null) {
    console.log("Adding plugin from " + url, plugin);

    return function (dispatch, getState) {
        const state = getState();
        const plugins = state.plugins;

        const existentPluginState = _.valuesIn(plugins).find(pluginState => {
            return plugin.TYPE_INFO.type === pluginState.pluginType;
        });

        if (existentPluginState) {
            registerPlugin(plugin);
            return;
        }

        let pluginType = "unknown";
        if (plugin.Datasource !== undefined) {
            pluginType = "datasource";
        }
        if (plugin.Widget !== undefined) {
            pluginType = "widget";
        }

        dispatch({
            type: Action.ADD_PLUGIN,
            id: pluginType + "/" + plugin.TYPE_INFO.type,
            typeInfo: plugin.TYPE_INFO,
            url,
            pluginType: pluginType
        });
        registerPlugin(plugin);
    }
}


const pluginsCrudReducer = genCrudReducer([Action.ADD_PLUGIN, Action.DELETE_PLUGIN], plugin);
export function plugins(state = initialState, action) {
    state = pluginsCrudReducer(state, action);
    switch (action.type) {
        default:
            return state;
    }

}

function plugin(state, action) {
    switch (action.type) {
        case Action.ADD_PLUGIN:
            if (!action.typeInfo.type) {
                // TODO: Catch this earlier
                throw new Error("A Plugin needs a type name.");
            }

            return {
                id: action.pluginType + "/" + action.typeInfo.type,
                url: action.url,
                typeInfo: action.typeInfo,
                isDatasource: action.pluginType === "datasource",
                isWidget: action.pluginType === "widget"
            };
        default:
            return state;
    }

}