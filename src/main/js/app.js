'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const client = require('./client');

const follow = require('./follow');

const root = '/api';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {patients: []};
    }

    loadFromServer(pageSize) {
        follow(client, root, [
            {rel: 'patients', params: {size: pageSize}}]
        ).then(patientCollection => {
            return client({
                method: 'GET',
                path: patientCollection.entity._links.profile.href,
                headers: {'Accept': 'application/schema+json'}
            }).then(schema => {
                this.schema = schema.entity;
                return patientCollection;
            });
        }).done(patientCollection => {
            this.setState({
                patients: patientCollection.entity._embedded.patients,
                attributes: Object.keys(this.schema.properties),
                pageSize: pageSize,
                links: patientCollection.entity._links
            });
        })
    }

    componentDidMount() {
        this.loadFromServer(this.state.pageSize);
    }

    render() {
        return (
            <PatientList patients={this.state.patients}/>
        )
    }
}

class CreateDialog extends React.Component {

    constructor(props) {
        super(prosp);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault = {};
        const newPatient = {};
        this.props.attributes.forEach(attribute => {
            newPatient[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onCreate(newPatient);

        // clear out the dialog's inputs
        this.props.attributes.forEach(attributes => {
            ReactDOM.findDOMNode(this.refs[attributes]).value = '';
        });

        // Navigate away from the dialog to hide it
        window.location = "#";
    }

    render() {
        const inputs = this.props.attributes.map(attributes =>
            <p key={attributes}>
                <input type="text" placeholder={attributes} ref={attributes} className="field"/>
            </p>
        );

        return (
            <div>
                <a href="#createPatient">Create</a>

                <div id="createPatient" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Create new patient</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Create</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }


}

class PatientList extends React.Component {
    render() {
        const patients = this.props.patients.map(patient =>
            <Patient key={patient._links.self.href} patient={patient}/>
        );
        return (
            <table>
                <tbody>
                <tr>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Description</th>
                </tr>
                </tbody>
                {patients}
            </table>
        )
    }
}

class Patient extends React.Component {
    render() {
        return (
            <tr>
                <td>{this.props.patient.firstName}</td>
                <td>{this.props.patient.lastName}</td>
                <td>{this.props.patient.description}</td>
            </tr>
        )
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById('react')
)