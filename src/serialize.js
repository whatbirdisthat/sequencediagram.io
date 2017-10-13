export function serialize(components) {
  return serializeComponents(components);
}

function serializeObject(object) {
  return object.id + ',' + encodeURIComponent(object.name);
}

function serializeMessage(message) {
  let res =
    message.id +
    ',' +
    message.sender +
    ',' +
    message.receiver +
    ',' +
    encodeURIComponent(message.name);
  if (message.isReply || message.isAsync) {
    res += ',';
    if (message.isReply) {
      res += 'r';
    }
    if (message.isAsync) {
      res += 'a';
    }
  }
  return res;
}

function serializeComponents(components) {
  return components.reduce((acc, component) => {
    let serializedComponent;
    if (component.id[0] === 'o') {
      serializedComponent = serializeObject(component);
    } else if (component.id[0] === 'm') {
      serializedComponent = serializeMessage(component);
    }
    return acc + (acc ? ';' : '') + serializedComponent;
  }, '');
}

function parseKey(id) {
  return id;
}

export function deserialize(serialized) {
  let objects = [];
  let messages = [];

  serialized.split(';').forEach(o => {
    if (!o) {
      return;
    }
    let parts = o.split(',');
    if (o[0] === 'o' && parts.length >= 2 && parts[0] && parts[1]) {
      objects.push({
        id: parseKey(parts[0]),
        name: decodeURIComponent(parts[1]),
      });
    } else if (
      o[0] === 'm' &&
      parts.length >= 4 &&
      parts[0] &&
      parts[1] &&
      parts[2] &&
      parts[3]
    ) {
      const isReply = parts[4] && parts[4].indexOf('r') >= 0;
      const isAsync = parts[4] && parts[4].indexOf('a') >= 0;
      messages.push({
        id: parseKey(parts[0]),
        sender: parts[1],
        receiver: parts[2],
        name: decodeURIComponent(parts[3]),
        isReply: isReply ? true : undefined,
        isAsync: isAsync ? true : undefined,
      });
    }
  });

  // Make sure all messages only references objects that were
  // successfully deserialized
  messages = messages.filter(message => {
    const senderExists = objects.find(object => object.id === message.sender);
    const receiverExists = objects.find(
      object => object.id === message.receiver
    );
    return senderExists && receiverExists;
  });

  return {
    objects,
    messages,
  };
}
