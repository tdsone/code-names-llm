"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ai_1 = require("../ai");
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    try {
        const cards = await (0, ai_1.generateCodenamesCards)();
        res.json({ success: true, cards });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to generate game cards.' });
    }
});
exports.default = router;
//# sourceMappingURL=game.js.map