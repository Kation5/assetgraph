var _ = require('underscore');

module.exports = function (queryObj) {
    var coffeeScript;
    try {
        coffeeScript = require('coffee-script');
    } catch (e) {
        throw new Error('transforms.compileCoffeeScriptToJavaScript: The "coffee-script" module is required. Please run "npm install coffee-script" and try again (tested with version 1.2.0).');
    }

    return function compileCoffeeScriptToJavaScript(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'CoffeeScript'}, queryObj)).forEach(function (coffeeScriptAsset) {
            var javaScriptAsset = new assetGraph.JavaScript({
                text: coffeeScript.compile(coffeeScriptAsset.text)
            });
            if (coffeeScriptAsset.url) {
                javaScriptAsset.url = coffeeScriptAsset.url.replace(/\.coffee$|$/, javaScriptAsset.defaultExtension);
            }
            coffeeScriptAsset.replaceWith(javaScriptAsset);
            // FIXME: This should be a side effect of setting HtmlScript.href or something:
            javaScriptAsset.incomingRelations.forEach(function (incomingRelation) {
                if (incomingRelation.type === 'HtmlScript') {
                    var typeAttributeValue = incomingRelation.node.getAttribute('type');
                    if (typeAttributeValue === 'text/coffeescript') {
                        incomingRelation.node.removeAttribute('type');
                        incomingRelation.from.markDirty();
                    }
                }
            });
        });
    };
};
