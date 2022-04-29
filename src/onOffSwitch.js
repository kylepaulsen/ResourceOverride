const createOnOffSwitch = () => {
    const onOffSwitchTemplate = document.getElementById("onOffSwitchTemplate");
    return document.importNode(onOffSwitchTemplate.content, true);
};

export default createOnOffSwitch;
