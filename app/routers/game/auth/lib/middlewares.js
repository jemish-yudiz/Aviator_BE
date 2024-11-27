const { User } = require('../../../../models');
const { requestLimiter } = require('../../../../utils');

const middleware = {};

middleware.apiLimiter = (req, res, next) => {
    const params = {
        path: req.path,
        remoteAddress: req.sRemoteAddress || '127.0.0.1',
        maxRequestTime: 1000,
    };
    requestLimiter.setLimit(params, error => {
        if (error) return res.reply(messages.too_many_request());
        next();
    });
};

middleware.isAuthenticated = async (req, res, next) => {
    try {
        const token = req.header('authorization');
        if (!token) return res.reply(messages.unauthorized());

        const decodedToken = _.decodeToken(token);
        if (!decodedToken) return res.reply(messages.unauthorized());

        const project = {
            sUserName: true,
            sEmail: true,
            eStatus: true,
            sToken: true,
            nChips: true,
        };

        const user = await User.findOne({ _id: decodedToken._id }, project).lean();

        if (!user) return res.reply(messages.custom.user_not_found);
        if (user.sToken !== token) return res.reply(messages.unauthorized());
        if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
        if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
        req.user = user;
        next();
    } catch (error) {
        res.reply(messages.server_error(), error.toString());
    }
};

module.exports = middleware;
