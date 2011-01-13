/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    relations = require('./relations'),
    _ = require('underscore'),
    graphviz = require('graphviz'),
    error = require('./error');

var allIndices = {
    relation: ['id', 'type', 'from', 'to'],
    asset: ['id', 'url', 'type']
};

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
    this.assets = [];
    this.relations = [];
    this.indices = {};
    _.each(allIndices, function (indexNames, indexType) {
       this.indices[indexType] = {};
       indexNames.forEach(function (indexName) {
           this.indices[indexType][indexName] = {};
       }, this);
    }, this);
};

SiteGraph.prototype = {
    addToIndex: function (indexType, obj) {
        allIndices[indexType].forEach(function (indexName) {
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this.indices[indexType][indexName];
                    if (!(key in index)) {
                        index[key] = [obj];
                    } else {
                        index[key].push(obj);
                    }
                    (this.indices[indexType][indexName][key] = this.indices[indexType][indexName][key] || []).push(obj);
                }
            }
        }, this);
    },

    lookupIndex: function (indexType, indexName, value) {
        return this.indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    existsInIndex: function (indexType, indexName, value) {
        return this.lookupIndex(indexType, indexName, value).length > 0;
    },

    findRelations: function (indexName, value) {
        return this.lookupIndex('relation', indexName, value);
    },

    findAssets: function (indexName, value) {
        return this.lookupIndex('asset', indexName, value);
    },

    registerAsset: function (asset) {
        this.assets.push(asset);
        this.addToIndex('asset', asset);
    },

    // Relations must be registered in order
    registerRelation: function (relation) {
        this.relations.push(relation);
        this.addToIndex('relation', relation);
    },

    // This cries out for a rich query facility/DSL!
    lookupSubgraph: function (startAsset, relationLambda) { // preorder
        var that = this,
            subgraph = new SiteGraph();
        function traverse (asset) {
            if (!subgraph.existsInIndex('asset', 'id', asset)) {
                subgraph.registerAsset(asset);
                that.lookupIndex('relation', 'from', asset).forEach(function (relation) {
                    traverse(relation.to);
                    if (!subgraph.existsInIndex('relation', 'id', relation)) {
                        subgraph.registerRelation(relation);
                    }
                });
            }
        }
        traverse(startAsset);
        return subgraph;
    },

    toGraphViz: function () {
        var g = graphviz.digraph("G");
        this.assets.forEach(function (asset) {
            g.addNode(asset.id.toString(), {label: 'url' in asset ? path.basename(asset.url) : 'inline'});
        }, this);
        this.relations.forEach(function (relation) {
            var edge = g.addEdge(relation.from.id.toString(), relation.to.id.toString());
        }, this);
        console.log(g.to_dot());
        g.output('png', 'graph.png');
    }
};
