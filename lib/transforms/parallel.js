var _ = require('underscore'),
    step = require('step');

exports.parallel = function () { // transform1, transform2, ...
    var childTransforms = _.toArray(arguments);
    return function parallel(assetGraph, cb) {
        if (childTransforms.length) {
            step(
                function () {
                    childTransforms.forEach(function (childTransform) {
                        childTransform(assetGraph, this.parallel());
                    }, this);
                },
                cb
            );
        } else {
            process.nextTick(cb);
        }
    };
};