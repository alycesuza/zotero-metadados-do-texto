var app;
var chromeHandle;
async function startup({id,version,rootURI}) {
  const scope={Zotero,Services,ChromeUtils,Cc,Ci};
  Services.scriptloader.loadSubScript(rootURI+"core.js",scope);
  Services.scriptloader.loadSubScript(rootURI+"config.js",scope);
  Services.scriptloader.loadSubScript(rootURI+"runtime.js",scope);
  const aomStartup=Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
  chromeHandle=aomStartup.registerChrome(Services.io.newURI(rootURI+"manifest.json"),[["content",scope.PluginConfig.slug,"./"]]);
  app=scope.createMaintenanceApp({id,version,rootURI,panelURI:"chrome://"+scope.PluginConfig.slug+"/content/panel.xhtml",core:scope.Core,config:scope.PluginConfig});
  app.start();
}
function shutdown(){if(app)app.stop();app=undefined;if(chromeHandle)chromeHandle.destruct();chromeHandle=undefined;}
function install(){}
function uninstall(){}
